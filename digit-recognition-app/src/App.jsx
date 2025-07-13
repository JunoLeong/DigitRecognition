import React, { useRef, useEffect, useState, useCallback } from 'react';
import HandyPenLogo from './assets/HandyPen.svg';
import CatAvatar from './assets/Cat.svg';

import * as tf from "@tensorflow/tfjs";

const App = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [model, setModel] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [isLoadingModel, setIsLoadingModel] = useState(true);
  const [modelError, setModelError] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 400 });
  const [catMessage, setCatMessage] = useState(null);

  // Teachable Machine model URL
  const MODEL_URL = 'https://teachablemachine.withgoogle.com/models/fWaCH2zzy/model.json';

  // Resize canvas to fit container
  const resizeCanvas = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Save current drawing
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Calculate new size based on container
    const containerRect = container.getBoundingClientRect();
    const maxSize = Math.min(containerRect.width - 32, containerRect.height - 32, 500);
    const newSize = Math.max(280, maxSize);
    
    setCanvasSize({ width: newSize, height: newSize });
    
    // Update canvas size
    canvas.width = newSize;
    canvas.height = newSize;
    
    // Restore white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, newSize, newSize);
    
    // Restore drawing if it existed
    if (imageData.width > 0 && imageData.height > 0) {
      ctx.putImageData(imageData, 0, 0);
    }
  }, []);

  // Load Teachable Machine model
  const loadModel = useCallback(async () => {
  setIsLoadingModel(true);
  setModelError(null);
  try {
    const loadedModel = await tf.loadLayersModel(MODEL_URL);
    setModel(loadedModel);
    setCatMessage("✏️Draw a digit above!");
    console.log('Teachable Machine model loaded successfully!');
  } catch (error) {
    console.error('Model loading failed:', error);
    setModelError('AI model loading failed. Please check your network connection.');
  } finally {
    setIsLoadingModel(false);
  }
}, []);

  // Load model and setup resize listener
  useEffect(() => {
    loadModel();
    
    const handleResize = () => {
      setTimeout(resizeCanvas, 100);
    };
    
    window.addEventListener('resize', handleResize);
    setTimeout(resizeCanvas, 100);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [loadModel, resizeCanvas]);

  // Get canvas context with responsive line width
  const getCanvasContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // Dynamic line width based on canvas size
    const lineWidth = Math.max(8, canvas.width * 0.025);
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    return ctx;
  }, []);

  // Get touch/mouse coordinates relative to canvas
  const getCoordinates = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    
    if (e.type.includes('touch')) {
      e.preventDefault();
      const touch = e.touches[0] || e.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }, []);

  // Start drawing
  const startDrawing = useCallback((e) => {
    e.preventDefault();
    setIsDrawing(true);
    const ctx = getCanvasContext();
    if (!ctx) return;
    
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setPrediction(null);
    setConfidence(null);
  }, [getCanvasContext, getCoordinates]);

  // Draw
  const draw = useCallback((e) => {
    e.preventDefault();
    if (!isDrawing) return;
    
    const ctx = getCanvasContext();
    if (!ctx) return;
    
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing, getCanvasContext, getCoordinates]);

  // Stop drawing
  const stopDrawing = useCallback((e) => {
    e.preventDefault();
    setIsDrawing(false);
    const ctx = getCanvasContext();
    if (ctx) {
      ctx.closePath();
    }
  }, [getCanvasContext]);

  // Clear canvas & bubble message
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getCanvasContext();
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setPrediction(null);
      setConfidence(null);
      setCatMessage("✏️Draw a digit above!");
    }
  }, [getCanvasContext]);

  // Waiting and success messages
  const waitingMessages = [
  "Recognising, wait a moment...",
  "Scanning your masterpiece...",
  "Analyzing your drawing...",
  "Let me take a look...",
  "Thinking hard...",
  ];

  const successMessages = [
  "I got it!",
  "Looks familiar!",
  "Here's my guess!",
  "That was easy!",
  "I'm pretty sure it's this!",
  ];

  // Random message generator function
  const getRandomMessage = (messages) => {
  const index = Math.floor(Math.random() * messages.length);
  return messages[index];
};


  // Predict digit
  const predictDigit = useCallback(async () => {
  if (!model) {
    showMessage('AI model not loaded yet or loading failed.');
    return;
  }

  showMessage(getRandomMessage(waitingMessages));

  const canvas = canvasRef.current;
  if (!canvas) return;

  // 创建 224x224 的临时 canvas
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = 224;
  tempCanvas.height = 224;
  const tempCtx = tempCanvas.getContext('2d');

  // 填充白色背景（Teachable Machine 模型默认是白底图）
  tempCtx.fillStyle = 'white';
  tempCtx.fillRect(0, 0, 224, 224);

  // 把你的画布绘制进去（自动缩放）
  tempCtx.drawImage(canvas, 0, 0, 224, 224);

  // 获取图像数据（RGBA）
  const imageData = tempCtx.getImageData(0, 0, 224, 224);

  // 转换成 tensor，并归一化 [0, 1]
  const tensor = tf.browser.fromPixels(imageData)
    .toFloat()
    .div(255.0) // 归一化
    .expandDims(); // 添加 batch 维度 [1, 224, 224, 3]

  try {
  const predictions = await model.predict(tensor).data();
  tensor.dispose();

  let maxConfidence = 0;
  let predictedClass = -1;

  for (let i = 0; i < predictions.length; i++) {
    if (predictions[i] > maxConfidence) {
      maxConfidence = predictions[i];
      predictedClass = i;
    }
  }

  if (predictedClass === -1) {
    showMessage("Couldn't recognize anything.");
    return;
  }

  setPrediction(predictedClass);
  setConfidence((maxConfidence * 100).toFixed(2));

    setTimeout(() => {
      showMessage(`${getRandomMessage(successMessages)} It's a ${predictedClass}.`);
    }, 400); 

  } catch (error) {
    showMessage("Oops! Recognition failed.");
    console.error(error);
  }
}, [model]);


  // Message functions
  const showMessage = (msg) => setCatMessage(msg);
  const hideMessage = () => setCatMessage(null);

  return (
    <div className="min-h-[100dvh] max-w-full bg-gradient-to-br from-pink-200 via-purple-200 to-indigo-200 flex flex-col items-center justify-start p-4 font-sans relative overflow-hidden">
      {/* Logo - Fully responsive */}
      <div className="w-full flex justify-center">
        <img 
          src={HandyPenLogo} 
          alt="HandyPen Logo" 
          className="w-full max-w-[780px] min-w-[300px] object-contain"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentNode.innerHTML = '<div class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-purple-600 text-center">📝 HandyPen</div>';
          }}
        />
      </div>

      {/* Description - Responsive text */}
      <div className="w-full max-w-4xl text-center mb-6">
        <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 px-4 font-medium leading-relaxed">
          Write any digit (0-9). Let the machine detect what number you wrote!
        </p>
      </div>

      {/* Main container - Responsive layout */}
      <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12">
        
        {/* Drawing area container - Fully responsive */}
        <div 
          ref={containerRef}
          className="relative bg-white/80 backdrop-blur-sm border-4 border-black rounded-3xl shadow-2xl p-4 sm:p-6 md:p-8 flex-shrink-0"
          style={{ width: '100%', maxWidth: '600px' }}
        >
          
          {/* Decorative elements - Responsive visibility */}
          <div className="hidden md:block absolute -top-4 -left-4 w-12 h-12 lg:w-16 lg:h-16 text-yellow-400 transform rotate-[-20deg] z-10">
            <svg fill="currentColor" viewBox="0 0 20 20" className="w-full h-full drop-shadow-lg">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.538 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.783.57-1.838-.197-1.538-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.929 8.72c-.783-.57-.381-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.292z"></path>
            </svg>
          </div>

          <div className="hidden md:block absolute -bottom-4 -right-4 w-12 h-12 lg:w-16 lg:h-16 text-red-400 transform rotate-[15deg] z-10">
            <div className="w-full h-full flex items-center justify-center text-2xl lg:text-3xl drop-shadow-lg">❤️</div>
          </div>

          {/* Canvas container - Responsive */}
          <div className="relative flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              className="border-3 border-gray-400 rounded-2xl bg-white cursor-crosshair shadow-inner touch-none max-w-full max-h-full"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              style={{ 
                touchAction: 'none',
                width: '100%',
                height: 'auto',
                aspectRatio: '1/1'
              }}
            />
          </div>
        </div>

        {/* Right side - Controls and Results */}
        <div className="<div className=flex flex-col sm:flex-row lg:flex-col gap-4 w-full max-w-sm min-h-[180px]">
          
          {/* Control buttons - Responsive */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-4 w-full max-w-sm">
            <button
              onClick={clearCanvas}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-red-400 to-red-500 text-white font-bold text-lg rounded-2xl shadow-lg hover:from-red-500 hover:to-red-600 active:from-red-600 active:to-red-700 transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-red-300"
            >
              🗑️ Clear
            </button>
            <button
              onClick={predictDigit}
              disabled={isLoadingModel || modelError}
              className={`flex-1 px-6 py-4 bg-gradient-to-r from-green-400 to-green-500 text-white font-bold text-lg rounded-2xl shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-green-300 ${
                isLoadingModel || modelError 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:from-green-500 hover:to-green-600 active:from-green-600 active:to-green-700'
              }`}
            >
              {isLoadingModel ? '🔄 Loading...' : '🔍 Recognize'}
            </button>
          </div>

          {/* Results area - Responsive */}
          <div className="relative w-full flex items-start min-h-[120px]">
            {/* Cat Avatar - fixed left side */}
            <img 
              src={CatAvatar} 
              alt="Cat Avatar" 
              className="w-[160px] sm:w-[200px] md:w-[260px] lg:w-[280px] h-auto object-contain -ml-4 sm:-ml-6 lg:-ml-10" 
            />

            {/* Bubble placeholder */}
            <div className="ml-[-20px] mt-6 sm:mt-10 flex-1 min-h-[80px] flex items-start">
              {catMessage ? (
                <div className="cat-message-bubble">
                  {catMessage}
                </div>
              ) : (
                <div className="invisible cat-message-bubble">
                  {catMessage || "✏️ Draw a digit above!"}
                </div>
              )}
            </div>
          </div>


  {/* Results dialog */}
  <div className="relative bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-xl border-2 border-gray-200 w-full text-center">
    {prediction !== null ? (
      <div className="space-y-2">
        <div className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
          {prediction}
        </div>
        <div className="text-sm text-gray-600">
          Confidence: <span className="font-semibold">{confidence}%</span>
        </div>
      </div>
    ) : (
      <div className="text-gray-500 font-medium">
        {isLoadingModel ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            Loading AI...
          </div>
        ) : modelError ? (
          <div className="text-red-500 text-sm">
            {modelError}
          </div>
        ) : (
          "✅ Model loaded and ready!"
        )}
      </div>
    )}
  </div>
</div>

        </div>

      {/* Custom message box - Responsive */}
      <div id="messageBox" className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 hidden p-4">
        <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-2xl text-center max-w-sm w-full border border-gray-200">
          <p id="messageText" className="text-lg font-semibold text-gray-800 mb-4"></p>
          <button
            onClick={hideMessage}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 transform hover:scale-105"
          >
            ✅ OK
          </button>
        </div>
      </div>

      {/* Footer - Responsive */}
      <div className="mt-8 lg:mt-12 text-center text-gray-600 text-sm">
        Build by <a href="https://github.com/JunoLeong" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Juno Leong</a>, 2025
      </div>

    </div>
  );
};

export default App;