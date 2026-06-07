import Quagga from '@ericblade/quagga2';

export function initScanner(videoElement, onDetected) {
  Quagga.init(
    {
      inputStream: {
        type: 'LiveStream',
        target: videoElement,
        constraints: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
      decoder: {
        readers: ['ean_reader', 'ean_8_reader', 'code_128_reader'],
        multiple: false,
      },
      locate: true,
    },
    (err) => {
      if (err) {
        console.error('Quagga init error:', err);
        return;
      }
      Quagga.start();
    }
  );

  Quagga.onDetected((result) => {
    const code = result.codeResult?.code;
    if (code) {
      onDetected(code);
    }
  });
}

export function stopScanner() {
  try {
    Quagga.stop();
  } catch (_) {
    // already stopped
  }
}
