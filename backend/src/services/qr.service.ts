import QRCode from 'qrcode';

export class QrService {
 static async generarDataUrl(idCorto: string): Promise<string> {
    try {
      return await QRCode.toDataURL(idCorto, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        margin: 2,
        width: 300,
      });
    } catch (error) {
      console.error('Error al generar el código QR DataURL:', error);
      throw new Error('No se pudo generar la imagen del código QR');
    }
  }

  // Agregamos de nuevo el método helper
  static async guardarArchivoQr(idCorto: string, pathDestino: string): Promise<void> {
    try {
      await QRCode.toFile(pathDestino, idCorto, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 300,
      });
    } catch (error) {
      console.error('❌ Error al guardar el archivo QR:', error);
      throw error;
    }
  }
}