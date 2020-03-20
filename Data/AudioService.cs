using NAudio.Dsp;
using NAudio.Wave;
using System;
using System.Linq;

namespace BeatBox.Data
{
    public class AudioService
    {
        public int AverageIntensity => (int)Spectrograph.Sum() / Spectrograph.Length;

        public Complex[] FftBuffer { get; set; }
        public double[] Spectrograph { get; set; }

        private int fftPos;
        private const int fftLength = 2048; // NAudio fft wants powers of two!


        public AudioService()
        {
            if (!IsPowerOfTwo(fftLength)) throw new ArgumentException("FFT Length must be a power of two!");

            FftBuffer = new Complex[fftLength];
            Spectrograph = new double[1024];

            var capture = new WasapiLoopbackCapture();

            capture.RecordingStopped += (s, a) => capture.Dispose();
            capture.DataAvailable += (s, a) =>
            {
                byte[] buffer = a.Buffer;
                int bytesRecorded = a.BytesRecorded;
                int bufferIncrement = capture.WaveFormat.BlockAlign;

                for (int index = 0; index < bytesRecorded; index += bufferIncrement)
                {
                    float sample32 = BitConverter.ToSingle(buffer, index);
                    Add(sample32);
                }
            };

            capture.StartRecording();
        }

        public void Add(float value)
        {
            // Remember the window function! There are many others as well.
            FftBuffer[fftPos].X = (float)(value * FastFourierTransform.HammingWindow(fftPos, fftLength));
            FftBuffer[fftPos].Y = 0; // This is always zero with audio.
            fftPos++;
            if (fftPos >= fftLength)
            {
                fftPos = 0;
                FastFourierTransform.FFT(true, (int)Math.Log(fftLength, 2.0), FftBuffer);
                FftCalculated();
            }
        }

        private void FftCalculated()
        {
            int step = FftBuffer.Length / Spectrograph.Length;
            Spectrograph = FftBuffer
                .Select((a, i) => (Intensity: GetIntensity(a), Index: i))
                .GroupBy(
                    f => f.Index / step,
                    f => f.Intensity,
                    (spectroIndex, intensities) => (SpectroIndex: spectroIndex, AverageIntensity: intensities.Average()))
                .Select(i => i.AverageIntensity)
                .ToArray();
        }

        private double GetIntensity(Complex c)
        {
            double intensityDB = 10 * Math.Log10(Math.Sqrt((c.X * c.X) + (c.Y * c.Y)));
            return intensityDB;
        }

        private bool IsPowerOfTwo(int x) => (x & (x - 1)) == 0;
    }
}