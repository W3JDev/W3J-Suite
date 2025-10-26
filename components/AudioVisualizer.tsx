import React, { useRef, useEffect } from 'react';

interface AudioVisualizerProps {
  stream: MediaStream | null;
  isActive: boolean;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ stream, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // FIX: Initialize useRef with null for type safety and to resolve potential linter error.
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    if (!stream || !canvasRef.current) return;

    // FIX: Use modern AudioContext and remove webkit fallback to resolve type error.
    const audioContext = new window.AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    
    const draw = () => {
      if (!canvasCtx || !canvas) return;
      
      animationFrameId.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i];
        
        const isUserSpeaking = isActive && barHeight > 20; // Simple threshold for speaking
        const colorIntensity = isUserSpeaking ? Math.min(1, barHeight / 150) : 0.1;

        const gradient = canvasCtx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, `rgba(50, 184, 198, ${colorIntensity * 0.7})`); // Teal base
        gradient.addColorStop(1, `rgba(167, 169, 169, ${colorIntensity * 0.5})`); // Lighter top

        canvasCtx.fillStyle = gradient;
        canvasCtx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      // FIX: Safely cancel animation frame.
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      source.disconnect();
      analyser.disconnect();
      audioContext.close();
    };
  }, [stream, isActive]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
};
