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
        var imagedata = context.createImageData(imageWidth, imageHeight);
        data.forEach( (d, i) => {
          var c = Math.floor(255.0 * d / maxValue);
          imagedata.data[i * 4    ] = c;
          imagedata.data[i * 4 + 1] = c;
          imagedata.data[i * 4 + 2] = c;
          imagedata.data[i * 4 + 3] = 255;
        })

        var id = Math.random().toString().replace('.','');
        try {
          canvas = fx.canvas();
        } catch (e) {
          alert(e);
          return;
        }
       // convert the image to a texture
        var texture = canvas.texture(imagedata);
        canvas.draw(texture).update();
        // insert canvas into widget
        el.appendChild(canvas);

        $(el).append( $(`<div id="brightness_${id}" class="brightness slider"></div>`) );
        $(el).append( $(`<div id="contrast_${id}" class="contrast slider"></div>`) );

        var refreshFilter = function(event, ui) {
          var brightness = ($( `#brightness_${id}` ).slider( "value" ) - 128) / 128
            , contrast   = ($( `#contrast_${id}` ).slider( "value" ) - 128) / 128
            ;
          $(ui.handle.parentNode).find('.ui-slider-handle').text( Math.floor(100 * (ui.value - 127) / 128.0) + '%');
          // console.log(brightness, contrast);
          canvas.draw(texture).brightnessContrast(brightness, contrast).update();
        };

        $('div.slider').slider({
          orientation: "vertical",
          range: "min",
          max: 255,
          value: 127,
          slide: refreshFilter,
          change: refreshFilter
        });

        $( `#brightness_${id}` ).slider( "value", 66  );
        $( `#contrast_${id}`   ).slider( "value", 240 );

      },

      resize: function(width, height) {

        // TODO: code to re-render the widget with a new size

      }

    };
  }
});
