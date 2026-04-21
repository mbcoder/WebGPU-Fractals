
async function main() {
  console.log("main started!");
  const DEVICE = await initGPUDevice();
  const C_SCALE_FACTOR = 0.98;

  let scale_factor = C_SCALE_FACTOR;
  let scale = 1.0;

  async function updateMandelBrot() {
    const w = g_userInput.w
    const h = g_userInput.h
    const mandelbrot_center = {
      re: g_userInput.center.re,
      im: g_userInput.center.im
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


    if (scale > 1.0) {
      scale_factor = C_SCALE_FACTOR;
    }
    else if (scale < 0.00001) {
      scale_factor = 1.0 / C_SCALE_FACTOR;
    }
    scale *= scale_factor;


    window.requestAnimationFrame(updateMandelBrot);

  }
  updateMandelBrot();
}

main()