
const default_userInput = {
  w: 1024,
  h: 1024,
  center: {
    re: -0.348426337841269,
    im: -0.606539402343932
  }
}

const g_userInput = {
  w: 1024,
  h: 1024,
  center: {
    re: -0.348426337841269,
    im: -0.606539402343932
  }
}

function initUserInput() {
  g_userInput.h = default_userInput.h;
  g_userInput.w = default_userInput.w;
  g_userInput.center.re = default_userInput.center.re;
  g_userInput.center.im = default_userInput.center.im;
  
  document.getElementById('w').value        = default_userInput.h;
  document.getElementById('h').value        = default_userInput.w;
  document.getElementById('centerRe').value = default_userInput.center.re;
  document.getElementById('centerIm').value = default_userInput.center.im;
  
  const canvas = document.querySelector("canvas")
  if (canvas) {
    canvas.width= default_userInput.w
    canvas.height= default_userInput.h
  }
}

function onUpdateWidth() {
  const str = document.getElementById('w').value

  if (str.length == 0) {
    g_userInput.w = 1024
  } else {
    g_userInput.w = parseInt(str, 10);
  }

  document.getElementById('w').value = g_userInput.w

  const canvas = document.querySelector("canvas");
  if (canvas) {
    canvas.width = g_userInput.w
  }
}

function onUpdateHeight() {
  const str = document.getElementById('h').value
  g_userInput.h = parseInt(str, 10);

  if (str.length == 0) {
    g_userInput.h = 1024
  } else {
    g_userInput.h = parseInt(str, 10);
  }

  document.getElementById('h').value = g_userInput.h

  const canvas = document.querySelector("canvas");
  if (canvas) {
    canvas.height = g_userInput.h
  }
}

function onUpdateCenterReal() {
  const str = document.getElementById('centerRe').value

  if (str.length == 0) {
    g_userInput.center.re = -0.348426337841269
  } else {
    g_userInput.center.re = parseFloat(str);
  }

  document.getElementById('centerRe').value = g_userInput.center.re
}

function onUpdateCenterImagine() {
  const str = document.getElementById('centerIm').value

  if (str.length == 0) {
    g_userInput.center.im = -0.606539402343932
  } else {
    g_userInput.center.im = parseFloat(str);
  }

  document.getElementById('centerIm').value = g_userInput.center.im
}

initUserInput()