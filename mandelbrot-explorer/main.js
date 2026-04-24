
async function main() {
  const w = 1024
  const h = 1024
  const DEVICE = await initGPUDevice(w, h);
  const C_SCALE_FACTOR = 0.9;

  let centre_re = -0.348426337841269;
  let centre_im = -0.606539402343932;
  let scale_factor = C_SCALE_FACTOR;
  let scale = 1.0;

  async function updateMandelBrot() {
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

    // display the performance metrics
    document.getElementById('fps').innerText = `${fps.toFixed(0)}`;
    document.getElementById('computeTime').innerText = `${compTime.toFixed(2)} ms`;
  }


  const buttons = document.querySelectorAll("button");

  function handleInput(direction) {
    switch(direction) {
      case "up": 
        centre_im = centre_im + (scale / 50);
        break;
      case "down":
        centre_im = centre_im - (scale / 50);
        break;
      case "left":
        centre_re = centre_re - (scale / 50);
        break;
      case "right":
        centre_re = centre_re + (scale / 50);
        break;
      case "in":
        scale_factor = C_SCALE_FACTOR;
        scale *= scale_factor;
        break;
      case "out":
        scale_factor = 1.0 / C_SCALE_FACTOR;
        scale *= scale_factor;
        break;
    }

    window.requestAnimationFrame(updateMandelBrot);
  }

  buttons.forEach(button => {
    const dir = button.dataset.dir;

    // Mouse / Touch
    button.addEventListener("mousedown", () => handleInput(dir));
    button.addEventListener("touchstart", (e) => {
      e.preventDefault();
      handleInput(dir);
    });
  });

  // Keyboard support
  document.addEventListener("keydown", (e) => {
    const map = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      s: "down",
      a: "left",
      d: "right",
      '=': "in",
      '-': "out",
    };

    if (map[e.key]) {
      handleInput(map[e.key]);
    }
  });


  updateMandelBrot();
}

main()