using NAudio.Dsp;
using NAudio.Wave;
using System;
using System.Threading;

namespace BeatBox.Data
{
    public class AudioService
    {
        // FFT
        public Complex[] fftBuffer;
        public double[] spectrograph;

        private WasapiLoopbackCapture _capture;
        private int fftPos;
        private static int fftLength = 8192; // NAudio fft wants powers of two!
        private int m;


        public AudioService()
        {
            if (!IsPowerOfTwo(fftLength))
            {
                throw new ArgumentException("FFT Length must be a power of two");
            }
            this.m = (int)Math.Log(fftLength, 2.0);
            this.fftBuffer = new Complex[fftLength];
            spectrograph = new double[1024];

            _capture = new WasapiLoopbackCapture();

            _capture.DataAvailable += (s, a) =>
            {
                byte[] buffer = a.Buffer;
                int bytesRecorded = a.BytesRecorded;
                int bufferIncrement = _capture.WaveFormat.BlockAlign;

                for (int index = 0; index < bytesRecorded; index += bufferIncrement)
                {
                    float sample32 = BitConverter.ToSingle(buffer, index);
                    Add(sample32);
                }
            };

            _capture.RecordingStopped += (s, a) =>
            {
                _capture.Dispose();
            };

            _capture.StartRecording();
        }

        bool IsPowerOfTwo(int x)
        {
            return (x & (x - 1)) == 0;
        }

        public void Add(float value)
        {
            // Remember the window function! There are many others as well.
            fftBuffer[fftPos].X = (float)(value * FastFourierTransform.HammingWindow(fftPos, fftLength));
            fftBuffer[fftPos].Y = 0; // This is always zero with audio.
            fftPos++;
            if (fftPos >= fftLength)
            {
                fftPos = 0;
                FastFourierTransform.FFT(true, m, fftBuffer);
                FftCalculated();
            }
        }

        private void FftCalculated()
        {
            int step = fftBuffer.Length / spectrograph.Length;
            int i = 0;
            for (int n = 0; n < fftBuffer.Length; n += step)
            {
                double yPos = 0;
                for (int b = 0; b < step; b++)
                {
                    yPos += GetIntensity(fftBuffer[n + b]);
                }
                spectrograph[i] = (yPos/step*-1);
                i++;
            }
        }

        public double GetIntensity(Complex c)
        {
            double intensityDB = 10 * Math.Log10(Math.Sqrt(c.X * c.X + c.Y * c.Y));
            return intensityDB;
        }
    }
}