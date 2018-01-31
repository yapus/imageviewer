HTMLWidgets.widget({

  name: 'imageviewer',

  type: 'output',

  factory: function(el, widgetWidth, widgetHeight) {
    var barchartSize        = 128
      , barchartExtraWidth  = 64
      , barchartExtraHeight = 24
      , outputValuesWidth   = 128
      , zoomIntensity       = 0.2
      , zoomSensitivity     = 1 / 120.0
      ;

    var widgetInnerHtml = ( id, w, h ) => {
      return `<div class="widgetcontainer"><!--
           --><div class="row row1"><!--
             --><svg id="barchartX" width="${barchartSize}" height="${h}" style="left:-${h+barchartExtraWidth-8}px;margin-right:-${h + barchartExtraWidth - barchartSize - barchartExtraHeight}px"></svg><!--
             --><canvas id="image" width="${w}" height="${h}"></canvas><!--
             --><div id="sliders"><!--
               --><div id="brightness_${id}" class="brightness slider"></div><!--
               --><div id="contrast_${id}" class="contrast slider"></div><!--
             --></div><!--
             --><svg id="intensityChart" width="${outputValuesWidth}" height="${h}"></svg><!--
             --><div class="rowend"></div><!--
           --></div><!--
           --><div class="row row2"><!--
             --><svg id="barchartY" width="${w+barchartExtraWidth}" height="${barchartSize}"
                     style="margin-left:${barchartExtraWidth + barchartExtraHeight}px"></svg><!--
             --><div id="outputValues"><!--
               --><ul><li>X:</li><input type="text" size="10"/></ul><!--
               --><ul><li>Y:</li><input type="text" size="10"/></ul><!--
               --><ul><li>VAL:</li><input type="text" size="10"/></ul><!--
             --></div><!--
           --></div><!--
           --></div>`
           .replace(/<!--.*?-->/g, '')
           ;
    };
    el.style.whiteSpace = 'nowrap';

    var getMousePos = (canvas, evt) => {
        var rect = canvas.getBoundingClientRect();
        return { x: evt.clientX - rect.left
               , y: evt.clientY - rect.top
               };
      };

    var selectOrAppend = (node, selector, append = selector) => {
      var c = node.select(selector);
      return c.empty()
            ? node.append(append)
            : c
    }

    var transposeArray = array => array[0].map( (col, i) => array.map( row => row[i] ) )

    var d3_xy_chart = ({ width  = 640, height = 480, xlabel = '', ylabel = '' } = {}) => {

      var imageWidth  = width + barchartExtraWidth
        , imageHeight = height + barchartExtraHeight

      var chart = (selection) => {
        selection.each(function(datasets) {
          const margin      = { top: 0, right: 0, bottom: barchartExtraHeight, left: barchartExtraWidth }
              , innerwidth  = width  - margin.left - margin.right
              , innerheight = height - margin.top - margin.bottom

            var x_scale = d3.scaleLinear()
                .range([0, innerwidth])
                .domain([ d3.min(datasets, d => d3.min(d.x) ),
                          d3.max(datasets, d => d3.max(d.x) ) ]) ;

            var y_scale = d3.scaleLinear()
                .range([innerheight, 0])
                .domain([ d3.min(datasets, function(d) { return d3.min(d.y); }),
                          d3.max(datasets, function(d) { return d3.max(d.y); }) ]) ;

            var color_scale = d3.scaleOrdinal(d3.schemeCategory10)
                .domain(d3.range(datasets.length)) ;

            var x_axis = d3.axisBottom()
                .scale(x_scale)
                .ticks( Math.floor(imageWidth / 100) )
                .tickSize(-5)

            var y_axis = d3.axisLeft()
                .scale(y_scale)
                .ticks(3, "e")
                .tickSize(-5)

            var x_grid = d3.axisBottom()
                .scale(x_scale)
                .ticks( Math.floor(imageWidth / 100) )
                .tickSize(-innerheight)
                .tickFormat("")

            var y_grid = d3.axisLeft()
                .scale(y_scale)
                .ticks(6)
                .tickSize(-innerwidth)
                .tickFormat("")

            var draw_line = d3.line()
                .x(d => x_scale(d[0]) )
                .y(d => y_scale(d[1]) )
            d3.curveLinear(draw_line)

            var svg = d3.select(this)
                .attr("width", width)
                .attr("height", height)

            selectOrAppend(svg, 'g')
                .attr("transform", `translate(${margin.left},${margin.top})`)

            svg = svg.select("g");

            selectOrAppend(svg, "g.x.grid", "g")
                .attr("class", "x grid")
                .attr("transform", `translate(0, ${innerheight})`)
                .call(x_grid);

            selectOrAppend(svg, "g.y.grid", "g")
                .attr("class", "y grid")
                .call(y_grid) ;

            selectOrAppend(
              selectOrAppend(svg, 'g.x.axis', 'g')
                .attr("class", "x axis")
                .attr("transform", `translate(0, ${innerheight})`)
                .call(x_axis)
            , "text.label"
            , "text"
            ).attr("dy", "-0.29em")
             .attr("x", innerwidth - 10)
             .attr("class", "label")
             .style("text-anchor", "end")
             .text(xlabel)
             ;

            selectOrAppend(
              selectOrAppend(svg, 'g.y.axis', 'g')
                .attr("class", "y axis")
                // .attr("transform", `translate(${innerwidth}, 0)`)
                .call(y_axis)
            , "text.label"
            , "text"
            ).attr("transform", "rotate(-90)")
             .attr("x", -innerheight + 16)
             .attr("dx", "0.29em")
             .attr("class", "label")
             .attr("dy", "-0.29em")
             .style("text-anchor", "end")
             .text(ylabel)
             ;

            var data_lines = svg.selectAll(".d3_xy_chart_line")
                .data(datasets.map(function(d) {return d3.zip(d.x, d.y); }));
            data_lines
                .enter().append("g")
                .attr("class", "d3_xy_chart_line")
            data_lines
                .exit().remove();

            selectOrAppend(data_lines, "path")
                .attr("class", "line")
                .attr("d", d => draw_line(d) )
                .attr("stroke", (_, i) => color_scale(i) );

            selectOrAppend(data_lines, "text")
                .datum((d, i) => { return {name: datasets[i].label, final: d[d.length-1]}; })
                .attr("transform", d => (
                    null != d && null != d.final
                      ? ( "translate(" + x_scale(d.final[0]) + "," + y_scale(d.final[1]) + ")" )
                      : ''
                  ))
                .attr("x", 3)
                .attr("dy", ".35em")
                .attr("fill", (_, i) => color_scale(i) )
                .text(d => d.name );

        }) ;
      }

      chart.width = (value) => {
          if (!arguments.length) return width;
          width = value;
          imageWidth  = width + barchartExtraWidth;
          return chart;
      }

      chart.height = (value) => {
          if (!arguments.length) return height;
          height = value;
          imageHeight = height + barchartExtraHeight;
          return chart;
      }

      chart.xlabel = (value) => {
          if(!arguments.length) return xlabel ;
          xlabel = value ;
          return chart ;
      }

      chart.ylabel = (value) => {
          if(!arguments.length) return ylabel ;
          ylabel = value ;
          return chart ;
      }

      return chart;
    }

    const d3_intensity_chart = ({ width = 576, height = 128, xlabel = '', ylabel = '', updated } = {}) => {
      const limit = { min: 0, width: Number.MAX_SAFE_INTEGER };
      const chart = (selection) => {
        selection.each(function(datasets) {
          const margin      = { top: 0, right: 0, bottom: height/2, left: 0 }
              , innerwidth  = width  - margin.left - margin.right
                innerheight = height - margin.top  - margin.bottom

            var x_scale = d3.scaleLinear()
                .range([0, innerwidth])
                .domain([ d3.min(datasets, d => d3.min(d.x) ),
                          d3.max(datasets, d => d3.max(d.x) ) ]) ;

            var y_scale = d3.scaleLinear()
                .range([innerheight, 0])
                .domain([ d3.min(datasets, d => d3.min(d.y) ),
                          d3.max(datasets, d => d3.max(d.y) * 1.05 ) ]) ;

            var color_scale = d3.scaleOrdinal(d3.schemeCategory10)
                .domain(d3.range(datasets.length)) ;

            var x_axis = d3.axisBottom()
                .scale(x_scale)
                .ticks( Math.floor(imageWidth / 100), "e" )
                .tickSize(-5)

            var y_axis = d3.axisLeft()
                .scale(y_scale)
                .ticks(3)
                .tickFormat("")
                .tickSize(-5)

            var x_grid = d3.axisBottom()
                .scale(x_scale)
                .ticks( Math.floor(imageWidth / 100) )
                .tickSize(-innerheight)
                .tickFormat("")
                // .attr("transform", d => 'rotate(-65)')
                ;

            var y_grid = d3.axisLeft()
                .scale(y_scale)
                .ticks(6)
                .tickSize(-innerwidth)
                .tickFormat("")

            var draw_line = d3.line()
                .x(d => x_scale(d[0]) )
                .y(d => y_scale(d[1]) )
                d3.curveLinear(draw_line)

            var svg = d3.select(this)
                .attr("width", width)
                .attr("height", height);

            selectOrAppend(svg, 'g')
                .attr("transform", `translate(${margin.left},${margin.top})`) ;

            svg = svg.select("g");

            selectOrAppend(svg, "g.x.grid", "g")
                .attr("class", "x grid")
                .attr("transform", `translate(0, ${innerheight})`)
                .call(x_grid);

            selectOrAppend(svg, "g.y.grid", "g")
                .attr("class", "y grid")
                .call(y_grid) ;

            selectOrAppend(
              selectOrAppend(svg, 'g.x.axis', 'g')
                .attr("class", "x axis")
                .attr("transform", `translate(0, ${innerheight})`)
                .call(x_axis)
            , "text.label"
            , "text"
            ).attr("dy", "-.71em")
             .attr("x", innerwidth)
             .attr("class", "label")
             .style("text-anchor", "end")
             .text(xlabel)

            svg.select('g.x.axis').selectAll('text').attr('transform', d => 'rotate(90) translate(24, -7)')

            selectOrAppend(
              selectOrAppend(svg, 'g.y.axis', 'g')
                .attr("class", "y axis")
                // .attr("transform", `translate(${innerwidth}, 0)`)
                .call(y_axis)
            , "text.label"
            , "text"
            ).attr("transform", "rotate(-90)")
             .attr("y", 6)
             .attr("class", "label")
             .attr("dy", "0.71em")
             .style("text-anchor", "end")
             .text(ylabel)
             ;

            var data_lines = svg.selectAll(".d3_xy_chart_line")
                .data(datasets.map( d => d3.zip(d.x, d.y) ));
            data_lines
                .enter().append("g")
                .attr("class", "d3_xy_chart_line")
            data_lines
                .exit().remove();

            selectOrAppend(data_lines, "polyline")
              .attr("stroke", (_, i) => color_scale(i) )
              .attr("fill",   (_, i) => color_scale(i) )
              .attr("points", d => d.map(v => [ x_scale(v[0]), y_scale(v[1])] ))
              ;
            // selectOrAppend(data_lines, "path")
            //     .attr("class", "line")
            //     .attr("d", d => draw_line(d) )
            //     .attr("stroke", (_, i) => color_scale(i) );

            selectOrAppend(data_lines, "text")
                .datum((d, i) => { return {name: datasets[i].label, final: d[d.length-1]}; })
                .attr("transform", d => (
                    null != d && null != d.final
                      ? ( "translate(" + x_scale(d.final[0]) + "," + y_scale(d.final[1]) + ")" )
                      : ''
                  ))
                .attr("x", 3)
                .attr("dy", ".35em")
                .attr("fill", (_, i) => color_scale(i) )
                .text(d => d.name );

            var minX = d3.min(datasets, d => d3.min(d.x) )
              , maxX = d3.max(datasets, d => d3.max(d.x) )
            //  , minY = d3.min(datasets, d => d3.min(d.y) )
            //  , maxY = d3.max(datasets, d => d3.max(d.y) )
            // console.log(`minX=${x_scale(minX)}, maxX=${x_scale(maxX)}, minY=${y_scale(minY)}, maxY=${y_scale(maxY)}, maxX - minX = ${maxX - minX}`)
            if( 0 == limit.min && Number.MAX_SAFE_INTEGER == limit.width ) {
              limit.min   = minX
              limit.width = maxX
            }

            selectOrAppend(svg, "rect.selection", "rect")
                .attr("class", "selection")
                .attr("stroke", 'rgba(0, 0, 0, 0.3)')
                .attr("fill", 'rgba(0, 255, 0, 0.3)')
                .attr("x", x_scale(limit.min))
                .attr("y", 0)
                .attr("width", x_scale(limit.width))
                .attr("height", innerheight)
            d3.select("rect.selection").call(
              d3.drag().on("start", function(evt) {
                var rect = d3.select(this).classed("dragging", true);
                d3.event.on("drag", d=> {
                  limit.min = limit.min + Math.round((maxX - minX) * (d3.event.dx / innerwidth))
                  rect.raise().attr('x', x_scale(limit.min))
                  if ('function' === typeof updated ) updated()
                }).on("end", d => {
                  rect.classed("dragging", false)
                })
              })
            );
                // .attr({ x: 50, y: 0, width: innerwidth - 100, height: innerheight })
        })
      }
      return Object.assign(chart, {
        width  : value => ( arguments.length ? ( width  = value, chart ) : width  )
      , height : value => ( arguments.length ? ( height = value, chart ) : height )
      , xlabel : value => ( arguments.length ? ( xlabel = value, chart ) : xlabel )
      , ylabel : value => ( arguments.length ? ( ylabel = value, chart ) : ylabel )
      , limit  : value => ( 1 < arguments.length ? ( Object.assign(limit, value), chart ) : limit )
      , updated: value => ( arguments.length ? ( updated = value, chart ) : updated )
      })
    }


    var isUpdated = true;
    var wasResized = true;
    var imageWidth, imageHeight, canvasWidth, canvasHeight;
    var viewport = { x: 0, y: 0, w: 0, h: 0 };
    var xy_chart_wide, xy_chart_tall, xy_chart_intensity;
    var canvasMousePos = { x: NaN
                         , y: NaN
                         , in: true
                         , down: { x: NaN, y: NaN }
                         , click: false
                         };

    const zoomViewport = (zoomDelta) => {
      const wheel = zoomDelta * zoomSensitivity
          , zoom  = Math.exp(wheel*zoomIntensity)
          , scale = imageWidth / viewport.w
      if (scale > 8 && zoom > 1.0) return true
      const x = isNaN(canvasMousePos.x) ? 0 : canvasMousePos.x
      const y = isNaN(canvasMousePos.y) ? 0 : canvasMousePos.y
      viewport.x -= Math.round(x / (scale * zoom) - x / scale)
      viewport.y -= Math.round(y / (scale * zoom) - y / scale)
      viewport.w  = Math.round(viewport.w / zoom)
      viewport.h  = Math.round(viewport.h / zoom)
      if ( imageWidth  < viewport.w              ) viewport.w = imageWidth
      if ( imageHeight < viewport.h              ) viewport.h = imageHeight
      if ( 0           > viewport.x              ) viewport.x = 0
      if ( 0           > viewport.y              ) viewport.y = 0
      if ( imageWidth  < viewport.x + viewport.w ) viewport.x = 0
      if ( imageHeight < viewport.y + viewport.h ) viewport.y = 0
      return (isUpdated = canvasMousePos.in = true)
    }

    const renderValue = function(x) {
        var data         = ( null != x.data[0] && x.data[0].hasOwnProperty('length') )
                         ? [].concat(...transposeArray(x.data || []))
                         : x.data
          , settings     = x.settings || {}
          // , isBarChart   = ('bar' === settings.chart)
          , minValue     = data.reduce((a, b) => (a < b ? a : b), Number.MAX_SAFE_INTEGER)
          , maxValue     = data.reduce((a, b) => (a < b ? b : a), 0)
          , normdata     = data.map((d, i) => Math.floor(255.0 * d / maxValue))
          ;
        imageWidth       = x.data.length     // || width
        imageHeight      = x.data[0].length  // || height

        var offsetWidth  = 0 < el.offsetWidth  ? el.offsetWidth  : imageWidth
          , offsetHeight = 0 < el.offsetHeight ? el.offsetHeight : (window.innerHeight || imageHeight)
          , initialBrightness = isNaN(parseFloat(settings.brightness, 10)) ? 0.0 : parseFloat(settings.brightness, 10)
          , initialContrast   = isNaN(parseFloat(settings.contrast, 10))   ? 0.0 : parseFloat(settings.contrast,   10)
          ;
        canvasWidth  = offsetWidth  - barchartSize - barchartExtraWidth - outputValuesWidth
        canvasHeight = offsetHeight - barchartSize - barchartExtraHeight
        // proportional scaling
        if ( canvasWidth  < (imageWidth   / 8) ) canvasWidth  = imageWidth  / 8;
        if ( canvasHeight < (canvasHeight / 8) ) canvasHeight = imageHeight / 8;
        if ( (canvasWidth / imageWidth) > (canvasHeight / imageHeight) ) {
          canvasWidth = Math.round( 1.0 * canvasHeight * imageWidth / imageHeight );
        } else if ( (canvasWidth / imageWidth) < (canvasHeight / imageHeight) ) {
          canvasHeight = Math.round( 1.0 * canvasWidth * imageHeight / imageWidth );
        }

        xy_chart_wide = d3_xy_chart({ width : canvasWidth + barchartExtraWidth
                                    , height: barchartSize + barchartExtraHeight
                                    , xlabel: 'x'
                                    , ylabel: 'val'
                                    })
        xy_chart_tall = d3_xy_chart({ width : canvasHeight + barchartExtraWidth
                                    , height: barchartSize + barchartExtraHeight
                                    , xlabel: 'y'
                                    , ylabel: 'val'
                                    })

        xy_chart_intensity = d3_intensity_chart({ width  : canvasHeight // + barchartExtraWidth
                                                , height : barchartSize // + barchartExtraHeight
                                                , updated: () => isUpdated = true
                                                })
        xy_chart_intensity.updated( () => {
          console.log('xy_chart_intensity.updated')
          isUpdated = true
        })

        var id = el.id;
        $(el).append($(
          widgetInnerHtml( id, canvasWidth, canvasHeight )
        ));

        var canvas = document.getElementById('image');
        var context = canvas.getContext("2d");

        var barcharts = { X: { svg: d3.select( $(el).find('#barchartX')[0] ) }
                        , Y: { svg: d3.select( $(el).find('#barchartY')[0] ) }
                        }
        $(el).find('#intensityChart')
             .attr({ height: canvasHeight })
             .css({ marginLeft: `-${canvasHeight}px` })
        const add = 1.2
        const [ min, max ] = data.reduce( ([min, max], v) => {
          return [ min < v ? min : v
                 , max > v ? max : v
                 ] }, [Number.MAX_SAFE_INTEGER, 0])
        const intensityXdata = Array.from({ length: 256 }, (_, i) => Math.round(min + add * i * (( max - min ) / 256 )) )
        const intensityYData = data.reduce((res, v) => (
            res[ Math.round((256 * v / (add*maxValue)))]++
          , res
          ), Array.from({ length: 256 }, () => 0))
        var intensityChart = d3.select( $(el).find('#intensityChart')[0] )
        console.log({x: intensityXdata, y: intensityYData.filter(x => 0 != x) })
        intensityChart.data([[{ label: '', x: intensityXdata, y: intensityYData }]]).call(xy_chart_intensity)

        var imagedata = context.createImageData(imageWidth, imageHeight);
        const fillImageData = (data, minValue, maxValue) =>
          data.map((d, i) => Math.floor(255.0 * (d - minValue) / (maxValue - minValue)))
          .forEach( (c, i) => {
            imagedata.data[i * 4    ] = c;
            imagedata.data[i * 4 + 1] = c;
            imagedata.data[i * 4 + 2] = c;
            imagedata.data[i * 4 + 3] = 255;
          })
        fillImageData(data, minValue, maxValue)

        var refreshFilter = (event, ui) => {
          $(ui.handle.parentNode).find('.ui-slider-handle').text( Math.floor(100 * ui.value / 256.0) + '%');
          isUpdated = true;
        };
        $(el).find('div.slider').slider({
          orientation: "vertical",
          range: "min",
          max: 255,
          value: 127,
          slide: refreshFilter,
          change: refreshFilter
        });
        var brightnessSlider = $(el).find( `#brightness_${id}` )
          , contrastSlider   = $(el).find( `#contrast_${id}`   );

        brightnessSlider.slider( "value", Math.round(256.0 * initialBrightness) );
        contrastSlider.slider( "value",   Math.round(256.0 * initialContrast  ) );
        // $('#intensityChart').hide();
        // $('#sliders').hide();

        Object.assign(canvasMousePos, { x: NaN, y: NaN
                                      , in: true
                                      , down: { x: NaN, y: NaN }
                                      , click: false
                                      })
        Object.assign(viewport, { x: 0, y: 0, w: imageWidth, h: imageHeight });
        var realCursorPos = ({ x, y }) => {
          return {
              x : viewport.x + Math.floor(1.0 * x * viewport.w / canvasWidth )
            , y : viewport.y + Math.floor(1.0 * y * viewport.h / canvasHeight)
          };
        };

        var inputs = $(el).find('#outputValues input');
        const updateCursorValues = ({x, y}) => {
          inputs[0].value = x + 1;
          inputs[1].value = y + 1;
          inputs[2].value = null != data[ imageWidth * y + x ]
                          ? data[ imageWidth * y + x ].toExponential(3)
                          : 'NaN'
                          ;
        }

        canvas.addEventListener('mouseenter', evt => { canvasMousePos.in = true;  isUpdated = true; })
        canvas.addEventListener('mouseleave', evt => { canvasMousePos.in = false; isUpdated = true; })
        canvas.addEventListener('mousedown',  evt => { canvasMousePos.click = true; Object.assign(canvasMousePos.down, getMousePos(canvas, evt)); })
        canvas.addEventListener('mouseup',    evt => { canvasMousePos.click = false; canvasMousePos.down = { x: NaN, y: NaN }; })
        canvas.addEventListener('mousemove',  evt => {
          Object.assign(canvasMousePos, getMousePos(canvas, evt));
          var { x, y } = realCursorPos( canvasMousePos );
          if ( 0 > x || imageWidth < x || 0 > y || imageHeight < y ) return (isUpdated = true);

          updateCursorValues({ x, y })

          if ( canvasMousePos.click
            && !isNaN(canvasMousePos.down.x) && !isNaN(canvasMousePos.down.y)
            && ( canvasMousePos.down.x != canvasMousePos.x || canvasMousePos.down.y != canvasMousePos.y )
          ) {
            var scale = imageWidth / viewport.w;
            viewport.x += Math.round((canvasMousePos.down.x - canvasMousePos.x) / scale);
            viewport.y += Math.round((canvasMousePos.down.y - canvasMousePos.y) / scale);
            canvasMousePos.down.x = canvasMousePos.x;
            canvasMousePos.down.y = canvasMousePos.y;
            if ( 0           > viewport.x              ) viewport.x = 0;
            if ( 0           > viewport.y              ) viewport.y = 0;
            if ( imageWidth  < viewport.x + viewport.w ) viewport.x = imageWidth  - viewport.w;
            if ( imageHeight < viewport.y + viewport.h ) viewport.y = imageHeight - viewport.h;
          }
          isUpdated = true;
        }, false);
        canvas.addEventListener('wheel', evt => {
          evt.stopImmediatePropagation();
          if (evt.altKey)
            brightnessSlider.slider( "value", brightnessSlider.slider( "value" ) + evt.deltaY );
          if (evt.shiftKey)
            contrastSlider.slider( "value", contrastSlider.slider( "value" ) + evt.deltaY );
          if (!evt.ctrlKey && !evt.altKey && !evt.shiftKey) {
            zoomViewport(evt.deltaY);
            updateCursorValues(realCursorPos( canvasMousePos ));
          }
        })

        var animationFrame = function() {
          var brightness = Math.floor(100 * brightnessSlider.slider( "value" ) / 256.0)
            , contrast   = Math.floor(100 * contrastSlider.slider( "value" )   / 256.0)
            ;
          if ( !isUpdated ) return requestAnimationFrame(animationFrame);

          const limit = xy_chart_intensity.limit()
          // console.log(limit, ((limit.min - minValue) + limit.width))
          fillImageData( data.map(x => (
            limit.min > x
            ? minValue
            : ((limit.min - minValue) + limit.width) < x
            ? maxValue
            : x
          )), minValue, maxValue)

          var filtered = ImageFilters.Resize(
              ImageFilters.CropBuiltin(
                ImageFilters.BrightnessContrastGimp(imagedata, brightness, contrast)
              , viewport.x, viewport.y
              , viewport.w, viewport.h
              )
            , canvasWidth
            , canvasHeight
            )

          context.putImageData(filtered, 0, 0);
          if ( wasResized ) {
            intensityChart.data([[{ label: '', x: intensityXdata, y: intensityYData }]]).call(xy_chart_intensity)
          }
          if ( canvasMousePos.in || wasResized ) {
            // cursor cross
            var cursorWidth = Math.ceil(imageWidth / viewport.w / 2)
            context.fillStyle = 'rgba(255, 0, 0, 0.5)'
            context.fillRect(0, canvasMousePos.y - cursorWidth, canvasWidth, cursorWidth)
            context.fillRect(canvasMousePos.x - cursorWidth, 0, cursorWidth, canvasHeight)
            const { x, y } = realCursorPos(canvasMousePos)
            // barcharts
            Object.keys(barcharts).forEach(k => {
              var svg = barcharts[k].svg;
              var line = data
                         .filter((v, i) => ( ('Y' === k)
                                             ? Math.floor(i / imageWidth) == y
                                             : (i % imageWidth) == x
                                            ))
                         .slice(...(('Y' === k)
                                   ? [ viewport.x, viewport.x + viewport.w ]
                                   : [ viewport.y, viewport.y + viewport.h ]) )
                         ;
              if ('Y' === k) {
                svg.data([[{
                  label: '' // `y = ${y}`
                , x    : Array.from(line, (_, i) => viewport.x + i)
                , y    : line
                }]]).call(xy_chart_wide);
              } else {
                svg.data([[{
                  label: '' // `x = ${x}`
                , x    : Array.from(line, (_, i) => viewport.y + i)
                , y    : line.reverse()
                }]]).call(xy_chart_tall);
              }
            })
          }
          isUpdated = wasResized = false;
          requestAnimationFrame(animationFrame);
        };
        animationFrame();
    };

    const resize = function(widgetWidth, widgetHeight) {
        // console.log(`resize.width=${widgetWidth}, resize.height=${widgetHeight}`);
        canvasWidth  = widgetWidth  - barchartSize - barchartExtraWidth - outputValuesWidth
        canvasHeight = widgetHeight - barchartSize - barchartExtraHeight - 16
        if ( canvasWidth  < (imageWidth  / 8) ) canvasWidth  = imageWidth  / 8
        if ( canvasHeight < (imageHeight / 8) ) canvasHeight = imageHeight / 8

        // proportional scaling
        if ( (canvasWidth / imageWidth) > (canvasHeight / imageHeight) ) {
          canvasWidth = Math.round( 1.0 * canvasHeight * imageWidth / imageHeight )
        } else if ( (canvasWidth / imageWidth) < (canvasHeight / imageHeight) ) {
          canvasHeight = Math.round( 1.0 * canvasWidth * imageHeight / imageWidth )
        }

        $(el).find('#image')
             .attr({ width: canvasWidth, height: canvasHeight });

        $(el).find('#barchartX')
             .attr({ width: canvasHeight, height: barchartSize })
             .css({ left       : `-${canvasHeight + barchartExtraWidth - 8}px`
                  , marginRight: `-${canvasHeight + barchartExtraWidth - barchartSize - barchartExtraHeight}px`
                  })
        $(el).find('#barchartY')
             .attr({ width: canvasWidth + barchartExtraWidth, height: barchartSize })
             .css({ marginLeft: `${barchartExtraWidth + barchartExtraHeight}px` })

        $(el).find('#intensityChart')
             .attr({ height: canvasHeight })
             .css({ marginLeft: `-${canvasHeight}px` })

        xy_chart_wide.width(  canvasWidth  + barchartExtraWidth  )
                     .height( barchartSize + barchartExtraHeight )
        xy_chart_tall.width(  canvasHeight + barchartExtraWidth  )
                     .height( barchartSize + barchartExtraHeight )
        xy_chart_intensity.width(  canvasHeight  )
                          .height( barchartSize  )
        zoomViewport(0)
        isUpdated = wasResized = true
    };

    return { renderValue
           , resize
           }
  }
});
