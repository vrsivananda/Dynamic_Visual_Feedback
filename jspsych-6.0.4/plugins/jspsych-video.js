/* jspsych-video.js
 * Josh de Leeuw
 *
 * This plugin displays a video. The trial ends when the video finishes.
 *
 * documentation: docs.jspsych.org
 *
 */

jsPsych.plugins.video = (function() {

  var plugin = {};

  plugin.info = {
    name: 'video',
    description: '',
    parameters: {
      sources: {
        type: jsPsych.plugins.parameterType.VIDEO,
        pretty_name: 'Sources',
        array: true,
        default: undefined,
        description: 'The video file to play.'
      },
      width: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Width',
        default: undefined,
        description: 'The width of the video in pixels.'
      },
      height: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Height',
        default: undefined,
        description: 'The height of the video display in pixels.'
      },
      autoplay: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Autoplay',
        default: true,
        description: 'If true, the video will begin playing as soon as it has loaded.'
      },
      controls: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Controls',
        default: false,
        description: 'If true, the subject will be able to pause the video or move the playback to any point in the video.'
      },
      prompt: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Prompt',
        default: null,
        description: 'Any content here will be displayed below the video content.'
      },
      start: {
        type: jsPsych.plugins.parameterType.FLOAT,
        pretty_name: 'Start',
        default: null,
        description: 'Time to start the clip.'
      },
      stop: {
        type: jsPsych.plugins.parameterType.FLOAT,
        pretty_name: 'Stop',
        default: null,
        description: 'Time to stop the clip.'
      }
    }
  }


  plugin.trial = function(display_element, trial) {

    //------------------Video Tag------------------
    
    // display stimulus
    var video_html = '<video id="jspsych-video-player" width="'+trial.width+'" height="'+trial.height+'" muted ';
    //If autoplay then add autoplay
    if(trial.autoplay){
      video_html += "autoplay "
    }
    //Add the controls
    if(trial.controls){
      video_html +="controls "
    }
    //Close the opening video tag
    video_html+=">"
    
    //Loop through the sources and add them inside the video tag
    for(var i=0; i<trial.sources.length; i++){
      var s = trial.sources[i];
      if(s.indexOf('?') > -1){
        s = s.substring(0, s.indexOf('?'));
      }
      var type = s.substr(s.lastIndexOf('.') + 1);
      type = type.toLowerCase();

      // adding start stop parameters if specified
      video_html+='<source src="'+trial.sources[i]

      /*
      // this isn't implemented yet in all browsers, but when it is
      // revert to this way of doing it.

      if (trial.start !== null) {
        video_html+= '#t=' + trial.start;
      } else {
        video_html+= '#t=0';
      }

      if (trial.stop !== null) {
        video_html+= ',' + trial.stop
      }*/
      
      video_html+='" type="video/'+type+'">';
    }
    //Close the video tag
    video_html +="</video>"

    //show prompt if there is one
    if (trial.prompt !== null) {
      video_html += trial.prompt;
    }
    
    display_element.innerHTML = video_html;
    
    
    
    //------------------Event handlers------------------
    
    //When video ends
    display_element.querySelector('#jspsych-video-player').onended = function(){
      end_trial();
    }

    // event handler to set timeout to end trial if video is stopped
    display_element.querySelector('#jspsych-video-player').onplay = function(){
      if(trial.stop !== null){
        if(trial.start == null){
          trial.start = 0;
        }
        jsPsych.pluginAPI.setTimeout(end_trial, (trial.stop-trial.start)*1000);
      }
    }
    
    // When set the video start time
    if(trial.start !== null){
      display_element.querySelector('#jspsych-video-player').currentTime = trial.start;
      //document.getElementById('jspsych-video-player').play();//[sivaHack]
    }

    // function to end trial when it is time
    var end_trial = function() {

      // gather the data to store for the trial
      var trial_data = {
        stimulus: JSON.stringify(trial.sources),
        frameTime: frameTime,
        frameTimeFromStart: frameTimeFromStart,
        magnitudes: magnitudes
        
      };

      // clear the display
      display_element.innerHTML = '';

      // move on to the next trial
      jsPsych.finishTrial(trial_data);
    };
    
    
    
    //------------------Variable Setup------------------
    
    //Variables for animation
    var frameTime = [];
    var frameTimeFromStart = [];
    var magnitudes = [];
    var stopDrawing = false;
    var previousTimestamp = null;
    var mouseX_global = canvasWidth/2;
    var mouseY_global = canvasHeight/2;
    var screenWidth = null;
    var screenHeight = null;
    
    //FixationCross
    var fixationCross = true;
    var fixationCrossHeight = 20;
    var fixationCrossWidth = 20;
    var fixationCrossThickness = 3;
    var fixationCrossColor = "white";
    
    // Clicking
    var clickRadius = 10;
    
    //Arrow
    arrowLineWidth = 1;
    arrowOutlineColor = "white";
    arrowBackgroundColor = "white";
    

    //------------------Canvas------------------
    
    
    //Get the video element
    var videoElement = document.getElementById('jspsych-video-player');
    videoElement.style.position = 'absolute';
    videoElement.style.zIndex = '-10';
    
    
    var canvasWidth = videoElement.clientWidth;
    var canvasHeight = videoElement.clientHeight;
    
    
    //Create a canvas element and append it to the DOM
    var canvas = document.createElement("canvas");
    document.getElementById("jspsych-content").appendChild(canvas);
    
    //Get the context of the canvas so that it can be painted on.
    var ctx = canvas.getContext("2d");
    
    document.addEventListener("keydown", function(e) {
      if (e.keyCode == 13) {
        //Make the video fullscreen
        if(screenfull.enabled){
          screenfull.request(videoElement);
          console.log("screenfull.request-ed");
        }
        //Set up the canvas
        setupCanvas();
      }//End of if jeyCode == 13
    }, false);
    
    function setupCanvas(){
      
      //Format the canvas
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      //canvas.style.position = 'absolute';
      canvas.style.zIndex = '10';
      canvas.style.backgroundColor = 'rgba(0,0,0,0)';
      
      //Add mousemove eventListener to the canvas
      canvas.addEventListener('mousemove', function(evt) {
        var mousePos = getMousePosition(canvas, evt);
        mouseX_global = mousePos.x; //Global variable
        mouseY_global = mousePos.y; //Global variable
      });
      
      
      //Add mousemove eventListener to the canvas
      canvas.addEventListener('click', function(evt) {
        var mousePos = getMousePosition(canvas, evt);
        mouseX_click = mousePos.x; //Global variable
        mouseY_click = mousePos.y; //Global variable
        
        //Calculate the distance from center
        var distance = Math.sqrt( 
                        Math.pow(mouseX_click-(canvasWidth/2),2) + 
                        Math.pow(mouseY_click-(canvasHeight/2),2) 
                      );
        
        //Start if distance less than threshold
        if(distance <= clickRadius){
          //Start the video and the recording of trials
          videoElement.play();
          animate();
        }
      });
      
    }//End of setupCanvas
    
    
    //------------------Fixation Cross before recording data------------------
      
    //Draw the fixation cross if we want it
    if(fixationCross === true){
      
      //Horizontal line
      ctx.beginPath();
      ctx.lineWidth = fixationCrossThickness;
      ctx.moveTo(canvasWidth/2 - fixationCrossWidth, canvasHeight/2);
      ctx.lineTo(canvasWidth/2 + fixationCrossWidth, canvasHeight/2);
      ctx.strokeStyle = fixationCrossColor;
      ctx.stroke();
      
      //Vertical line
      ctx.beginPath();
      ctx.lineWidth = fixationCrossThickness;
      ctx.moveTo(canvasWidth/2, canvasHeight/2 - fixationCrossHeight);
      ctx.lineTo(canvasWidth/2, canvasHeight/2 + fixationCrossHeight);
      ctx.strokeStyle = fixationCrossColor;
      ctx.stroke();
      
    }
    
    //------------------Arrow------------------
    
    //Function to update and draw the arrow
    function updateAndDraw(){
      
      //Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      //Draw the fixation cross if we want it
      if(fixationCross === true){
        
        //Horizontal line
        ctx.beginPath();
        ctx.lineWidth = fixationCrossThickness;
        ctx.moveTo(canvasWidth/2 - fixationCrossWidth, canvasHeight/2);
        ctx.lineTo(canvasWidth/2 + fixationCrossWidth, canvasHeight/2);
        ctx.fillStyle = fixationCrossColor;
        ctx.stroke();
        
        //Vertical line
        ctx.beginPath();
        ctx.lineWidth = fixationCrossThickness;
        ctx.moveTo(canvasWidth/2, canvasHeight/2 - fixationCrossHeight);
        ctx.lineTo(canvasWidth/2, canvasHeight/2 + fixationCrossHeight);
        ctx.fillStyle = fixationCrossColor;
        ctx.stroke();
      }
      
      
      
      //Transfer to local variables to keep it constant
      var mouseX_local = mouseX_global;
      var mouseY_local = mouseY_global;

      //Draw the arrow
      ctx.beginPath();
      ctx.arrow(canvasWidth/2, canvasHeight/2, mouseX_local, mouseY_local, [0, 1, -10, 1, -10, 5]);
      ctx.lineWidth = arrowLineWidth;
      ctx.strokeStyle = arrowOutlineColor;
      ctx.fillStyle = arrowBackgroundColor;
      ctx.fill();
      
      
      //Calculate the magnitude of the arrow
      var magnitude = Math.sqrt( Math.pow(mouseX_local-(canvasWidth/2),2) + Math.pow(mouseY_local-(canvasHeight/2),2) );
      
      //Push into the magnitudes array
      magnitudes.push(magnitude);
      
      
    }
    
    //Function to get mouse position
    function getMousePosition(canvas, evt){
      var rect = canvas.getBoundingClientRect();
      return{
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
      }
    }
    
    
    function animate() {
        //If stopping condition has been reached, then stop the animation
        if (stopDrawing) {
          window.cancelAnimationFrame(frameRequestID); //Cancels the frame request
        }
        //Else continue with another frame request
        else {
          frameRequestID = window.requestAnimationFrame(animate); //Calls for another frame request
          
          updateAndDraw(); //Update and draw the arrow
          
          //If this is before the first frame, then start the timestamp
          if(previousTimestamp === null){
            previousTimestamp = performance.now();
            trialStartTimeStamp = previousTimestamp;
          }
          //Else calculate the time and push it into the array
          else{
            var currentTimeStamp = performance.now(); //Variable to hold current timestamp
            frameTime.push(currentTimeStamp - previousTimestamp); //Push the interval into the frameRate array
            previousTimestamp = currentTimeStamp; //Reset the timestamp
            frameTimeFromStart.push(currentTimeStamp - trialStartTimeStamp);//Frame time from trial start
          }
        }
      }
    
    

  };//End of plugin

  return plugin;
})();
