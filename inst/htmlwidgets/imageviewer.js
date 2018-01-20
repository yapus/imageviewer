HTMLWidgets.widget({

  name: 'imageviewer',

  type: 'output',

  factory: function(el, width, height) {

    var barchartSize = 128;
    var widgetInnerHtml = (id, w, h) => {
      return `<div class="widgetcontainer"><div class="row row1" style="height:${h}px"><!--
           --><canvas id="barchartY" width="${barchartSize}" height="${h}"></canvas><!--
           --><canvas id="image" width="${w}" height="${h}"></canvas><div id="sliders"><!--
           --><div id="brightness_${id}" class="brightness slider"></div><!--
           --><div id="contrast_${id}" class="contrast slider"></div><!--
           --></div><div class="lineend"></div></div><!--
           --><div class="row row2"><!--
           --><div id="outputValues"><!--
           --><ul><li>X:</li><input type="text" size="10"/></ul><!--
           --><ul><li>Y:</li><input type="text" size="10"/></ul><!--
           --><ul><li>VAL:</li><input type="text" size="10"/></ul><!--
           --></div><!--
           --><canvas id="barchartX" width="${w}" height="${barchartSize}"></canvas><!--
           --></div></div>`;
    };
    el.style.whiteSpace = 'nowrap';

    var getMousePos = (canvas, evt) => {
        var rect = canvas.getBoundingClientRect();
        return { x: evt.clientX - rect.left
               , y: evt.clientY - rect.top
               };
      };

    return {

      renderValue: function(x) {

        var data        = ( null != x.data[0] && x.data[0].hasOwnProperty('length') )
                        ? [].concat(... (x.data || []) )
                        : x.data
          , settings    = x.settings || {}
          , isBarChart  = ('bar' === settings.chart)
          , maxValue    = data.reduce((a, b) => (a < b ? b : a), 0)
          , normdata    = data.map((d, i) => Math.floor(255.0 * d / maxValue))
          , imageWidth  = data.width  || width
          , imageHeight = data.height || height
          ;

        var id = el.id;
        $(el).append( $(widgetInnerHtml(id, imageWidth, imageHeight)) );

        var canvas = document.getElementById('image');
        var context = canvas.getContext("2d");

        var barcharts = { X: { canvas: $(el).find('#barchartX')[0] }
                        , Y: { canvas: $(el).find('#barchartY')[0] }
                        }
        Object.keys(barcharts).forEach( k =>
          barcharts[k].ctx = barcharts[k].canvas.getContext("2d")
        );

        var imagedata = context.createImageData(imageWidth, imageHeight);
        normdata.forEach( (c, i) => {
          imagedata.data[i * 4    ] = c;
          imagedata.data[i * 4 + 1] = c;
          imagedata.data[i * 4 + 2] = c;
          imagedata.data[i * 4 + 3] = 255;
        })

        context.putImageData(imagedata, 0, 0);

        var isUpdated = false;
        var refreshFilter = (event, ui) => {
          $(ui.handle.parentNode).find('.ui-slider-handle').text( Math.floor(100 * (ui.value - 127) / 128.0) + '%');
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

        brightnessSlider.slider( "value", 123 );
        contrastSlider.slider( "value", 245 );


        var canvasMousePos = { x: NaN, y: NaN, in: false };
        var inputs = $(el).find('#outputValues input');
        canvas.addEventListener('mouseenter', evt => { canvasMousePos.in = true;  isUpdated = true; })
        canvas.addEventListener('mouseleave', evt => { canvasMousePos.in = false; isUpdated = true; })
        canvas.addEventListener('mousemove', evt => {
          Object.assign(canvasMousePos, getMousePos(canvas, evt));
          inputs[0].value = canvasMousePos.x;
          inputs[1].value = canvasMousePos.y;
          inputs[2].value = data[ imageWidth * canvasMousePos.y + canvasMousePos.x ];
          isUpdated = true;
        }, false);
        canvas.addEventListener('wheel', evt => {
          evt.stopImmediatePropagation();
          if (evt.altKey)
            brightnessSlider.slider( "value", brightnessSlider.slider( "value" ) + evt.deltaY );
          if (evt.shiftKey)
            contrastSlider.slider( "value", contrastSlider.slider( "value" ) + evt.deltaY );
        })

        var animationFrame = function() {
          var brightness = Math.floor(100 * (brightnessSlider.slider( "value" ) - 127 ) / 128.0)
            , contrast   = Math.floor(100 * (contrastSlider.slider( "value" ) - 127 ) / 128.0)
            ;
          if ( !isUpdated ) return requestAnimationFrame(animationFrame);

          var filtered = ImageFilters.BrightnessContrastGimp(imagedata, brightness, contrast)
          context.putImageData(filtered, 0, 0);

          if ( canvasMousePos.in ) {
            // cursor cross
            context.fillStyle = 'red';
            context.fillRect(0, canvasMousePos.y, imageWidth, 1);
            context.fillRect(canvasMousePos.x, 0, 1, imageHeight);

            // barcharts
            Object.keys(barcharts).forEach(k => {
              var chart = barcharts[k].canvas
                , ctx   = barcharts[k].ctx
                ;
              ctx.clearRect(0, 0, chart.width, chart.height);
              ctx.strokeStyle = 'black';
              ctx.beginPath();
              ctx.setLineDash([5, 5]);
              if ('X' === k) {
                ctx.moveTo(canvasMousePos.x, 0           );
                ctx.lineTo(canvasMousePos.x, chart.height);
              } else {
                ctx.moveTo(0,           canvasMousePos.y);
                ctx.lineTo(chart.width, canvasMousePos.y);
              }
              ctx.stroke();

              if ( isBarChart ) {
                ctx.fillStyle = 'green';
              } else {
                ctx.strokeStyle = 'green';
                ctx.beginPath();
                ctx.setLineDash([]);
                ctx.moveTo(...( ('X' === k)
                            ? [ 0, chart.height ]
                            : [ chart.width, 0 ]
                              ) );
              }

              var line = normdata.filter((v, i) => (
                  ('X' === k)
                  ? Math.floor(i / imageWidth) == canvasMousePos.y
                  : (i % imageWidth) == canvasMousePos.x
                )).map(v => v / 2);

              for (var i = 0; i < imageWidth; i++) {
                if ('X' === k) {
                  if ( isBarChart ) ctx.fillRect(i, chart.height - line[i], 1, line[i]);
                  else              ctx.lineTo(i, chart.height - line[i]);
                } else {
                  if ( isBarChart ) ctx.fillRect(chart.width - line[i], i, line[i], 1);
                  else              ctx.lineTo(chart.width - line[i], i);
                }
              }
              // if ( !isBarChart )
                ctx.stroke();
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
