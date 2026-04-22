
async function main() {
  console.log("main started!");
  const DEVICE = await initGPUDevice();
  const C_SCALE_FACTOR = 0.99;

  let centre_re = -0.348426337841269;
  let centre_im = -0.606539402343932;
  let scale_factor = C_SCALE_FACTOR;
  let scale = 1.0;

  async function updateMandelBrot() {
    const w = 1024
    const h = 1024
    const mandelbrot_center = {
      re: centre_re,
      im: centre_im
    }
    const rmin = mandelbrot_center.re - scale;
    const imin = mandelbrot_center.im - scale;
    const rmax = mandelbrot_center.re + scale;
    const imax = mandelbrot_center.im + scale;

    // get compute result from GPU
    var startTime = performance.now()
    const result = await computeMandelBrot(w, h, rmin, imin, rmax, imax, DEVICE);
    var endTime = performance.now()
    const compTime = endTime - startTime;
    const fps = 1000 / compTime;

    const sum = result.reduce((v0, v1) => {
      return v0 + v1;
    }, 0);
    
    let canvas = document.querySelector("canvas");
    
    if (canvas) { 
      const ctx = canvas.getContext("2d");
      if (!ctx) { 
        alert("no ctx, canvas.getContext('2d') failed") 
      }
      const src = new Uint8ClampedArray(result.buffer);
      const imgData = new ImageData(src, w, h);
      ctx.putImageData(imgData, 0, 0);
    }

    document.getElementById('imgSize').innerText = `${w} * ${h}`;
    document.getElementById('dataSize').innerText = `${(result.byteLength / 1000).toFixed(2)}`;
    document.getElementById('fps').innerText = `${fps.toFixed(0)}`;
    document.getElementById('computeTime').innerText = `${compTime.toFixed(2)} ms`;
    document.getElementById('data').innerText = `${sum}`;


    //if (scale > 1.0) {
    //  scale_factor = C_SCALE_FACTOR;
    //}
    //else if (scale < 0.00001) {
    //  scale_factor = 1.0 / C_SCALE_FACTOR;
    //}
    //scale *= scale_factor;


    //window.requestAnimationFrame(updateMandelBrot);

  }

  //listen to mouse events on the canvas
  let canvas = document.getElementById('mandelbrotCanvas');

  canvas.addEventListener('mousemove', function (event) {      

      //if (event.button == 0) {
      //  console.log('move with mouse pressed')
      //  console.log(event);
      //}
      
      //updateMandelBrot();
  });

  // 
  // Zooming in and out and generating new canvas image
  //
  canvas.addEventListener('wheel', function (event) {
      let scroll_coefficient = 1.0;
      // identify if is a big wheel move or a small one
      if (Math.abs(event.deltaY) > 300) {
        scroll_coefficient = 0.9;
      }


      if (event.deltaY > 0) {
        //zoom in
        scale_factor = C_SCALE_FACTOR * scroll_coefficient;
      } else {
        //zoom out
        scale_factor = 1.0 / (C_SCALE_FACTOR * scroll_coefficient);
      }
      scale *= scale_factor;
      window.requestAnimationFrame(updateMandelBrot);
  });

  updateMandelBrot();
}

main()