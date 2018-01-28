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
      , width
      , height
      ;

    if (null != widgetWidth && null != widgetHeight) {
      width  = widgetWidth;
      height = widgetHeight;
    } else {
      var widgetSize = el.offsetWidth < el.offsetHeight ? el.offsetHeight : el.offsetWidth
      var canvasSize = widgetSize - barchartSize - barchartExtraWidth - outputValuesWidth
      console.log(`el.offsetWidth=${el.offsetWidth}; el.offsetHeight=${el.offsetHeight}`)
      console.log(`widgetSize=${widgetSize}; canvasSize=${canvasSize}`)

      width  = null != widgetWidth
             ? widgetWidth
             : canvasSize
      height = null != widgetHeight
             ? widgetHeight
             : canvasSize
    }

    var widgetInnerHtml = ( id, w, h ) => {
      return `<div class="widgetcontainer"><!--
           --><div class="row row1"><!--
             --><svg id="barchartX" width="${barchartSize}" height="${h}" style="left:-${h+barchartExtraWidth-8}px;margin-right:-${h + barchartExtraWidth - barchartSize - barchartExtraHeight}px"></svg><!--
             --><canvas id="image" width="${w}" height="${h}"></canvas><!--
             --><div id="sliders"><!--
               --><div id="brightness_${id}" class="brightness slider"></div><!--
               --><div id="contrast_${id}" class="contrast slider"></div><!--
             --></div><!--
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

    var d3_xy_chart = ({
        width = 640
      , height = 480
      , xlabel = "X Axis Label"
      , ylabel = "Y Axis Label"
      , rotate = '0deg'
    } = {}) => {

      var imageWidth  = width + barchartExtraWidth
        , imageHeight = height + barchartExtraHeight
        ;

      var chart = (selection) => {
        selection.each(function(datasets) {
            //
            // Create the plot.
            //
            var margin = {top: 0, right: 0, bottom: barchartExtraHeight, left: barchartExtraWidth},
                innerwidth = width - margin.left - margin.right,
                innerheight = height - margin.top - margin.bottom ;

            var x_scale = d3.scale.linear()
                .range([0, innerwidth])
                .domain([ d3.min(datasets, d => d3.min(d.x) ),
                          d3.max(datasets, d => d3.max(d.x) ) ]) ;

            var y_scale = d3.scale.linear()
                .range([innerheight, 0])
                .domain([ d3.min(datasets, function(d) { return d3.min(d.y); }),
                          d3.max(datasets, function(d) { return d3.max(d.y); }) ]) ;

            var color_scale = d3.scale.category10()
                .domain(d3.range(datasets.length)) ;

            var x_axis = d3.svg.axis()
                .scale(x_scale)
                .ticks( Math.floor(imageWidth / 100) )
                .tickSize(-5)
                .orient("bottom") ;

            var y_axis = d3.svg.axis()
                .scale(y_scale)
                .ticks(3, "e")
                .tickSize(-5)
                .orient("left");
                // .orient("right") ;

            var x_grid = d3.svg.axis()
                .scale(x_scale)
                .orient("bottom")
                .ticks( Math.floor(imageWidth / 100) )
                .tickSize(-innerheight)
                .tickFormat("") ;

            var y_grid = d3.svg.axis()
                .scale(y_scale)
                .orient("left")
                .ticks(6)
                .tickSize(-innerwidth)
                .tickFormat("") ;

            var draw_line = d3.svg.line()
                .interpolate("linear")
                .x(d => x_scale(d[0]) )
                .y(d => y_scale(d[1]) );

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
             ;

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
          return chart;
      }

      chart.height = (value) => {
          if (!arguments.length) return height;
          height = value;
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

    var transposeArray = array => array[0].map( (col, i) => array.map( row => row[i] ) )

    return {

      renderValue: function(x) {
        var data         = ( null != x.data[0] && x.data[0].hasOwnProperty('length') )
                         ? [].concat(...transposeArray(x.data || []))
                         : x.data
          , settings     = x.settings || {}
          , isBarChart   = ('bar' === settings.chart)
          , maxValue     = data.reduce((a, b) => (a < b ? b : a), 0)
          , normdata     = data.map((d, i) => Math.floor(255.0 * d / maxValue))
          , imageWidth   = x.data.length     // || width
          , imageHeight  = x.data[0].length  // || height
          // , imageWidth   = x.data[0].length     // || width
          // , imageHeight  = x.data.length        // || height
          , canvasWidth  = imageWidth  < width  ? imageWidth  : width
          , canvasHeight = imageHeight < height ? imageHeight : height
          , initialBrightness = isNaN(parseFloat(settings.brightness, 10)) ? 0.03 : parseFloat(settings.brightness, 10)
          , initialContrast   = isNaN(parseFloat(settings.contrast, 10))   ? 0.95 : parseFloat(settings.contrast,   10)
          ;
        // proportional scaling
        if ( canvasWidth == imageWidth && canvasHeight < imageHeight ){
          canvasWidth = Math.round( 1.0 * canvasHeight * imageWidth / imageHeight );
        } else if ( canvasWidth < imageWidth && canvasHeight == imageHeight ) {
          canvasHeight = Math.round( 1.0 * canvasWidth * imageHeight / imageWidth );
        }
        console.log(`imageWidth=${imageWidth}; imageHeight=${imageHeight}`);
        console.log(`canvasWidth=${canvasWidth}; canvasHeight=${canvasHeight}`);

        var xy_chart_wide = d3_xy_chart({ width : canvasWidth + barchartExtraWidth
                                        , height: barchartSize + barchartExtraHeight
                                        , xlabel: ''
                                        , ylabel: ''
                                        });
        var xy_chart_tall = d3_xy_chart({ width : canvasHeight + barchartExtraWidth
                                        , height: barchartSize + barchartExtraHeight
                                        , xlabel: ''
                                        , ylabel: ''
                                        });

        var id = el.id;
        $(el).append($(
          widgetInnerHtml( id, canvasWidth, canvasHeight )
        ));

        var canvas = document.getElementById('image');
        var context = canvas.getContext("2d");

        var barcharts = { X: { svg: d3.select( $(el).find('#barchartX')[0] ) }
                        , Y: { svg: d3.select( $(el).find('#barchartY')[0] ) }
                        }

        var imagedata = context.createImageData(imageWidth, imageHeight);
        normdata.forEach( (c, i) => {
          imagedata.data[i * 4    ] = c;
          imagedata.data[i * 4 + 1] = c;
          imagedata.data[i * 4 + 2] = c;
          imagedata.data[i * 4 + 3] = 255;
        })

        var isUpdated = false;
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

        var canvasMousePos = { x: NaN
                             , y: NaN
                             , in: true
                             , down: { x: NaN, y: NaN }
                             , click: false
                             };
        var viewport = { x: 0, y: 0, w: imageWidth, h: imageHeight };
        var realCursorPos = ({ x, y }) => {
          return {
              x : viewport.x + Math.floor(1.0 * x * viewport.w / canvasWidth )
            , y : viewport.y + Math.floor(1.0 * y * viewport.h / canvasHeight)
          };
        };

        var zoomViewport = (zoomDelta) => {
          var wheel = zoomDelta * zoomSensitivity;
          var zoom = Math.exp(wheel*zoomIntensity);
          var scale = imageWidth / viewport.w;
          if (scale > 8 && zoom > 1.0) return;

          viewport.x -= Math.round(canvasMousePos.x/(scale*zoom) - canvasMousePos.x/scale);
          viewport.y -= Math.round(canvasMousePos.y/(scale*zoom) - canvasMousePos.y/scale);
          viewport.w  = Math.round(viewport.w/zoom);
          viewport.h  = Math.round(viewport.h/zoom);
          if ( imageWidth  < viewport.w ) viewport.w = imageWidth;
          if ( imageHeight < viewport.h ) viewport.h = imageHeight;
          if ( 0           > viewport.x ) viewport.x = 0;
          if ( 0           > viewport.y ) viewport.y = 0;
          isUpdated = canvasMousePos.in = true;
        }

        var inputs = $(el).find('#outputValues input');
        canvas.addEventListener('mouseenter', evt => { canvasMousePos.in = true;  isUpdated = true; })
        canvas.addEventListener('mouseleave', evt => { canvasMousePos.in = false; isUpdated = true; })
        canvas.addEventListener('mousedown',  evt => { canvasMousePos.click = true; Object.assign(canvasMousePos.down, getMousePos(canvas, evt)); })
        canvas.addEventListener('mouseup',    evt => { canvasMousePos.click = false; canvasMousePos.down = { x: NaN, y: NaN }; })
        canvas.addEventListener('mousemove', evt => {
          Object.assign(canvasMousePos, getMousePos(canvas, evt));
          var { x, y } = realCursorPos( canvasMousePos );
          inputs[0].value = x + 1;
          inputs[1].value = y + 1;
          inputs[2].value = null != data[ imageWidth * y + x ]
                          ? data[ imageWidth * y + x ].toExponential(3)
                          : 'NaN'
                          ;
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
          }
        })

        var animationFrame = function() {
          var brightness = -Math.floor(100 * brightnessSlider.slider( "value" ) / 256.0)
            , contrast   = Math.floor(100 * contrastSlider.slider( "value" )   / 256.0)
            ;
          if ( !isUpdated ) return requestAnimationFrame(animationFrame);

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

          if ( canvasMousePos.in ) {
            // cursor cross
            context.fillStyle = 'red';
            context.fillRect(0, canvasMousePos.y, imageWidth, 1);
            context.fillRect(canvasMousePos.x, 0, 1, imageHeight);
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
          isUpdated = false;
          requestAnimationFrame(animationFrame);
        };
        animationFrame();

      },

      resize: function(width, height) {

        // TODO: code to re-render the widget with a new size

      }

    };
  }
});
