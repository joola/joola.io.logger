var options = {
  showLines: {
    env: {
      "n/a": true,
      qa: true,
      staging: true,
      demo: true,
      production: true
    },
    component: {
      "n/a": true,
      engine: true,
      analytics: true,
      sdk: true,
      config: true
    },
    level: {
      "n/a": true,
      silly: true,
      debug: true,
      info: true,
      warn: true,
      error: true
    }
  }
};

function checkLineHeight($line) {
  var $ghostDiv = $('.ghostdiv');
  $ghostDiv.append($line);
  return $ghostDiv.height();
}

function shouldShow(line, term) {
  var show = true;
  if (!line.level) {
    line = {
      timestamp: new Date(line.find('.timestamp').attr('title')),
      env: line.find('.env').text(),
      host: line.find('.host').text(),
      component: line.find('.component').text(),
      level: line.find('.level').text(),
      message: line.find('.message').text()
    }
  }
  if (!options.showLines.env[line.env])
    show = false;
  if (!options.showLines.level[line.level])
    show = false;
  if (!options.showLines.component[line.component])
    show = false;

  //var re = RegExp('.*?' + term + '.*');
  if (term && line.message.toLowerCase().indexOf(term.toLowerCase()) == -1)
    show = false;

  return show;
}

function drawLogLine(line) {
  //console.time('draw');
  var $line = $('<div class="line"></div>');
  var $timestamp = $('<span class="timestamp">&nbsp;</span>');
  var $env = $('<span class="env"></span>');
  var $host = $('<span class="host"></span>');
  var $component = $('<span class="component"></span>');
  var $level = $('<span class="level"></span>');
  var $message = $('<span class="message"></span>');

  $line.append($timestamp);
  $line.append($env);
  $line.append($host);
  $line.append($component);
  $line.append($level);
  $line.append($message);

  var baseHeight = checkLineHeight($line);

  $line.addClass(line.level);
  $timestamp.text(jQuery.timeago(line.timestamp));
  $timestamp.attr('title', line.timestamp);
  $env.text(line.env);
  $env.addClass(line.env);
  $host.text(line.host);
  $component.text(line.component);
  $level.text(line.level);
  $level.addClass(line.level);
  $message.text(line.message);

  var actualHeight = checkLineHeight($line);
  if (actualHeight > baseHeight) {
    var _message = line.message;
    while (actualHeight > baseHeight) {
      _message = _message.substring(0, _message.length - Math.ceil(_message.length * 0.05));
      $message.text(_message);
      actualHeight = checkLineHeight($line);
    }
    _message = _message.substring(0, _message.length - Math.ceil(_message.length * 0.05));
    $message.text(_message);
    $message.html($message.text() + '<span class="showmore">...</span>');
    $message.find('.showmore').on('click', function (e) {
      $message.text(line.message);
    })
  }

  if (!shouldShow(line)) {
    $line.hide();
  }

  $('.console').append($line);
  return $line;
}

function addLog(log) {
  var line = {};
  line.timestamp = new Date(log._timestamp);
  line.env = log.env;
  line.host = log.hostname;
  line.component = log.component;
  line.level = log.level;
  line.message = log.message;

  return drawLogLine(line);
}

var lastTimestamp = null;
var tail = true;
$(document).ready(function () {
  //create the ghost div for height check
  $('.console').append('<div class="line ghostdiv"></div>');

  var socket = io.connect('http://localhost');
  socket.on('last-log', function (data) {
    $(data).each(function (index, item) {
      addLog(item);
      lastTimestamp = item._timestamp;
    });

    if (data.length > 0 && tail)
      $("html, body").animate({ scrollTop: $(document).height() }, "slow");

    setTimeout(function () {
      socket.emit('last-log-fetch', {lastTimestamp: lastTimestamp });
    }, 500);
  });

  socket.emit('last-log-fetch', {lastTimestamp: lastTimestamp });

  var target = document.getElementById('console');
  if (target.addEventListener) {
    // IE9, Chrome, Safari, Opera
    target.addEventListener("mousewheel", MouseWheelHandler, false);
    // Firefox
    target.addEventListener("DOMMouseScroll", MouseWheelHandler, false);
  }
  // IE 6/7/8
  else target.attachEvent("onmousewheel", MouseWheelHandler);

  function MouseWheelHandler(e) {
    console.log('mouse');
    tail = false;
    $('#tail').removeClass('active');
  }

  $('#tail').on('click', function (e) {
    if (tail) {
      tail = false;
      $(this).removeClass('active');
    }
    else {
      tail = true;
      $(this).addClass('active');
      $("html, body").animate({ scrollTop: $(document).height() }, "slow");
    }
  });
  $('#tail').addClass('active');
});

var zoomListeners = [];
var call = function () {
  //console.log('resize');
};

zoomListeners.push(call);

(function () {
  // Poll the pixel width of the window; invoke zoom listeners
  // if the width has been changed.
  var lastWidth = 0;

  function pollZoomFireEvent() {
    var widthNow = jQuery(window).width();
    if (lastWidth == widthNow) return;
    lastWidth = widthNow;
    // Length changed, user must have zoomed, invoke listeners.
    for (i = zoomListeners.length - 1; i >= 0; --i) {
      zoomListeners[i]();
    }
  }

  setInterval(pollZoomFireEvent, 100);
})();


$().ready(function () {
  $('.chk-env, .chk-level, .chk-component').on('click', function (e) {
    var type = this.className.replace('chk-', '');
    var $this = $(this);

    options.showLines[type][$this.attr('data-name')] = $this.prop('checked');

    console.log(options);

    $('.line').each(function (index, line) {
      var $line = $(line);
      if (shouldShow($line))
        $line.show();
      else
        $line.hide();
    });

    if (tail)
      $("html, body").animate({ scrollTop: $(document).height() }, "slow");
  })

  $('.searchbox').on('keyup', function (e) {
    var term = $(this).val();
    if (term.length == 0) {
      $('.line').each(function (index, line) {
        var $line = $(line);
        if (shouldShow($line, term))
          $line.show();
        else
          $line.hide();
      })
      return;
    }
    if (term.length < 2)
      return;
    $('.line').each(function (index, line) {
      var $line = $(line);
      if (shouldShow($line, term))
        $line.show();
      else
        $line.hide();
    })
  })
});
