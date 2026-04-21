function fail(msg) {
  alert(msg);
}

async function initGPUDevice() {
  // WebGPU device initialization
  if (!navigator.gpu) {
    fail("WebGPU not supported on this browser.");
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    fail("No appropriate GPUAdapter found.");
  }

  const device = await adapter.requestDevice();
  return device
}

async function computeMandelBrot(w, h, rmin, imin, rmax, imax, device = null) {
  // check to see if we've already got a WebGPU device
  if (!device) {
    device = await initGPUDevice();
  }

  const MAX_ITERATIONS = 10000;
  const MAX_INTENSITY = 255;
  const WORKGROUP_SIZE = 8;

  // WGSL compute shader for generating the Mandelbrot
  const cellShaderModule = device.createShaderModule({
    label: "Cell shader",
    code: `
      // data structure
  
      struct Complex {
        re: f32,
        im: f32,
      };
  
      struct Mandelbrot_uniforms {
        width: u32,
        height: u32,
        max_iterations: u32,
        max_intensity: u32,
        rmin: f32,
        imin: f32,
        rmax: f32,
        imax: f32,
      };
  
      struct VertexOutput {
        @builtin(position) position: vec4f,
        @location(0) cell: vec2f,
      };
  
      // data binding
      @group(0) @binding(0) var<storage, read_write> cellStateOut: array<u32>;
      @group(0) @binding(1) var<uniform> unif: Mandelbrot_uniforms;
  
      //
      // complex number functions
      //
      
      fn complexMultiply(a: Complex, b: Complex) -> Complex {
        return Complex(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
      }
      
      fn complexAdd(a: Complex, b: Complex) -> Complex {
        return Complex(a.re + b.re, a.im + b.im);
      }
      
      fn complexNorm(a: Complex) -> f32 {
        return a.re * a.re + a.im * a.im;
      }
  
      //
      // mandelbrot functions
      //
      
      // Return number of iterations before escape or max_iterations if no escape.
      fn mandelbrot_for_point(c: Complex, max_iterations: u32) -> u32 {
        var p = c;
        var num_iterations = u32(1);
        while (complexNorm(p) <= 4.0 && num_iterations <= max_iterations)
        {
          p = complexAdd(complexMultiply(p, p), c);
          num_iterations++;
        }
        return num_iterations;
      }
  
      fn mandelbrot_colorize(num_iterations: u32, max_iterations: u32, max_intensity: u32) -> u32 {
        var col = u32(0);
        if (num_iterations < max_iterations)
        {
          col = u32(floor(sqrt(f32(num_iterations) / f32(max_iterations)) * f32(max_intensity)));
        }
        return col;
      }
  
      // utility functions
  
      fn getGrid() -> vec2u 
      {
        return vec2u(unif.width, unif.height);
      }
  
      fn cellIndex(cell: vec2u) -> u32 {
        let grid = getGrid();
  
        return (cell.y % u32(grid.y)) * u32(grid.x) +
               (cell.x % u32(grid.x));
      }
  
      // main stuff
      @compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, 1)
      fn computeMain(@builtin(global_invocation_id) id: vec3<u32>) {
        let h = id.x;
        let w = id.y;
        let i = cellIndex(id.xy);
        
        
        let re = (f32(w) / f32(unif.width)) * (unif.rmax - unif.rmin) + unif.rmin;
        let im = (f32(unif.height - h) / f32(unif.height)) * (unif.imax - unif.imin) + unif.imin;
        let col = mandelbrot_colorize(mandelbrot_for_point(Complex(re, im), unif.max_iterations), unif.max_iterations, unif.max_intensity);        
        cellStateOut[i] = pack4xU8(vec4<u32>(0, col, col, u32(unif.max_intensity)));
        
      }
  
      // for debug purpose
      @compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE}, 1)
      fn computeDebug(@builtin(global_invocation_id) cell: vec3u) {
        let i = cellIndex(cell.xy);
        cellStateOut[i] = pack4xU8(vec4<u32>(i/4, i/2, i/3, u32(unif.max_intensity)));;
        
        // let isTrue = i % 2 == 0;
        // if (isTrue) {
        //   cellStateOut[i] = 0x7cc818u;
        // } else {
        //  cellStateOut[i] = 0;
        // }
      }
    `
  });

  // Create the bind group layout and pipeline layout.
  const bindGroupLayout = device.createBindGroupLayout({
    label: "Cell Bind Group Layout",
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" } // Cell state output buffer
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE, // GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT
        buffer: {}
      }
    ]
  });

  const pipelineLayout = device.createPipelineLayout({
    label: "Cell Pipeline Layout",
    bindGroupLayouts: [bindGroupLayout],
  });

  // Create a compute pipeline that updates the game state.
  const computePipeline = device.createComputePipeline({
    label: "Compute pipeline",
    layout: pipelineLayout,
    compute: {
      module: cellShaderModule,
      entryPoint: "computeMain",
      // entryPoint: "computeDebug",
    }
  });


  // Create uniform buffer for mandelbrot.
  const mandelbrotUniformArray = new ArrayBuffer(8 * 4); // malloc 8 * 4 byte (must match with the layout defined in the shader)
  const mandelbrotUniformView = {
    u32Section: new Uint32Array(mandelbrotUniformArray, 0, 4),
    f32Section: new Float32Array(mandelbrotUniformArray, 16, 4),
  };

  mandelbrotUniformView.u32Section.set([w, h, MAX_ITERATIONS, MAX_INTENSITY]);
  mandelbrotUniformView.f32Section.set([rmin, imin, rmax, imax]);

  const mandelbrotUniformBuffer = device.createBuffer({
    label: "Mandelbrot Uniforms",
    size: mandelbrotUniformArray.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(mandelbrotUniformBuffer, 0, mandelbrotUniformArray);


  // Create an array representing the active state of each cell.
  const cellStateArray = new Uint32Array(w * h);

  // Create two storage buffers to hold the cell state.
  const cellStateStorage = device.createBuffer({
    label: "Cell State Storage",
    size: cellStateArray.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
  })
    ;

  device.queue.writeBuffer(cellStateStorage, 0, cellStateArray);

  const resultBuffer = device.createBuffer({
    label: 'Result buffer',
    size: cellStateArray.byteLength,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });


  // Create a bind group to pass the grid uniforms into the pipeline
  const bindGroup = device.createBindGroup({
    label: "Bind group",
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: { buffer: cellStateStorage }
      },
      {
        binding: 1,
        resource: { buffer: mandelbrotUniformBuffer }
      }
    ],
  })

  const encoder = device.createCommandEncoder();

  // Start a compute pass
  const computePass = encoder.beginComputePass();

  computePass.setPipeline(computePipeline);
  computePass.setBindGroup(0, bindGroup);
  const c = w > h ? w : h
  const workgroupCount = Math.ceil(c / WORKGROUP_SIZE);
  computePass.dispatchWorkgroups(workgroupCount, workgroupCount);
  computePass.end();

  // Encode a command to copy the results to a mappable buffer.
  encoder.copyBufferToBuffer(cellStateStorage, 0, resultBuffer, 0, resultBuffer.size);

  const commandBuffer = encoder.finish();
  device.queue.submit([commandBuffer]);

  // get result from GPU
  await resultBuffer.mapAsync(GPUMapMode.READ);
  const result = new Uint32Array(resultBuffer.getMappedRange().slice());
  resultBuffer.unmap();

  return result;
}