HTMLWidgets.widget({

  name: 'imageviewer',

  type: 'output',

  factory: function(el, width, height) {

    // TODO: define shared variables for this instance

    return {

      renderValue: function(x) {

        var data = [].concat(... (x.data || []) );
        var imageWidth  = 512
          , imageHeight = 512
          ;

        var maxValue = data.reduce((a, b) => (a < b ? b : a), 0);
        var canvas = document.createElement('canvas');
        var context = canvas.getContext("2d");

        var barcharts = Array.from({length: 2 }, (_, i) => {
          var barchart = document.createElement('canvas');
          barchart.id = `barchart${i + 1}`;
          barchart.width  = 0 === i ? 128 : imageWidth;
          barchart.height = 0 === i ? imageHeight : 128;
          barchart.style.border = '1px solid red';
          return barchart;
        });
        var barchartContexts = barcharts.map( barchart => barchart.getContext("2d") );

        var imagedata = context.createImageData(imageWidth, imageHeight);
        var normdata = data.map((d, i) => Math.floor(255.0 * d / maxValue));
        normdata.forEach( (c, i) => {
          imagedata.data[i * 4    ] = c;
          imagedata.data[i * 4 + 1] = c;
          imagedata.data[i * 4 + 2] = c;
          imagedata.data[i * 4 + 3] = 255;
        })

        el.style.whiteSpace = 'nowrap';

        var id = el.id;
        context.putImageData(imagedata, 0, 0);
        // convert the image to a texture
        // insert canvas into widget
        canvas.setAttribute('id', 'image');
        canvas.setAttribute('width', imageWidth);
        canvas.setAttribute('height', imageHeight);
        el.appendChild(barcharts[0]);
        el.appendChild(canvas);
        var slidersNode = $('<div id="sliders">');
        slidersNode.append( $(`<div id="brightness_${id}" class="brightness slider"></div>`) );
        slidersNode.append( $(`<div id="contrast_${id}" class="contrast slider"></div>`) );
        $(el).append( slidersNode );
        var outputValuesNode = $('<div id="outputValues"><span>X:</span><input type="text" size="10"/>&nbsp;<span>Y:</span><input type="text" size="10"/>&nbsp;<span>VALUE:</span><input type="text" size="10"/></div>');
        $(el).append(outputValuesNode);
        $(el).append(barcharts[1]);

        var refreshFilter = function(event, ui) {
          $(ui.handle.parentNode).find('.ui-slider-handle').text( Math.floor(100 * (ui.value - 127) / 128.0) + '%');
        };

        $('div.slider').slider({
          orientation: "vertical",
          range: "min",
          max: 255,
          value: 127,
          slide: refreshFilter,
          change: refreshFilter
        });

        $( `#brightness_${id}` ).slider( "value", 123 );
        $( `#contrast_${id}`   ).slider( "value", 245 );


        var canvasMousePos = { x: NaN, y: NaN, in: false };
        var getMousePos = (canvas, evt) => {
            var rect = canvas.getBoundingClientRect();
            return { x: evt.clientX - rect.left
                   , y: evt.clientY - rect.top
                   };
          };
        var inputs = $('#outputValues input');
        canvas.addEventListener('mouseenter', evt => { canvasMousePos.in = true; })
        canvas.addEventListener('mouseleave', evt => { canvasMousePos.in = false; })
        canvas.addEventListener('mousemove', evt => {
          Object.assign(canvasMousePos, getMousePos(canvas, evt));
          inputs[0].value = canvasMousePos.x;
          inputs[1].value = canvasMousePos.y;
          inputs[2].value = data[ imageWidth * canvasMousePos.y + canvasMousePos.x ];
          // var message = 'Mouse position: ' + canvasMousePos.x + ',' + canvasMousePos.y;
          // console.log(message);
        }, false);

        var animationFrame = function() {
          var brightness = Math.floor(100 * ($( `#brightness_${id}` ).slider( "value" ) - 127 ) / 128.0)
            , contrast   = Math.floor(100 * ($( `#contrast_${id}`   ).slider( "value" ) - 127 ) / 128.0)
            ;
          var filtered = ImageFilters.BrightnessContrastGimp(imagedata, brightness, contrast)
          context.putImageData(filtered, 0, 0);
          if ( canvasMousePos.in ) {
            context.fillStyle = 'red';
            context.fillRect(0, canvasMousePos.y, imageWidth, 1);
            context.fillRect(canvasMousePos.x, 0, 1, imageHeight);

            barchartContexts[1].clearRect(0, 0, barcharts[1].width, barcharts[1].height);
            barchartContexts[1].strokeStyle = 'black';
            barchartContexts[1].beginPath();
            barchartContexts[1].setLineDash([5, 10]);
            barchartContexts[1].moveTo(canvasMousePos.x, 0);
            barchartContexts[1].lineTo(canvasMousePos.x, barcharts[1].height);
            barchartContexts[1].stroke();
            barchartContexts[1].fillStyle = 'green';
            var line = normdata.filter((v, i) => Math.floor(i / imageWidth) == canvasMousePos.y)
                      .map(v => v / 2);
            for (var i = 0; i < imageWidth; i++) {
              barchartContexts[1].fillRect(i, barcharts[1].height - line[i], 1, line[i]);
            }
          }

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
