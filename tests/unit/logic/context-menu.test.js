/**
 * tests/unit/logic/context-menu.test.js
 * Unit testing for Right-Click Context Menu and Image Media Processing Logic
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const QRCode = require('qrcode');
const contextMenuService = require('../../../src/main/services/context-menu.service');

describe('Level 1: Context Menu & Image Processing Logic Tests', () => {

  describe('isImageUrl Detection', () => {
    test('should identify direct image URLs with common extensions', () => {
      assert.equal(contextMenuService.isImageUrl('https://cf.shopee.co.id/file/id-11134207-7rasa.jpg'), true);
      assert.equal(contextMenuService.isImageUrl('https://images.tokopedia.net/img/cache/900/product.png'), true);
      assert.equal(contextMenuService.isImageUrl('https://laz-img-cdn.alicdn.com/p/order.webp'), true);
      assert.equal(contextMenuService.isImageUrl('https://example.com/animation.gif?size=medium'), true);
      assert.equal(contextMenuService.isImageUrl('https://example.com/logo.svg'), true);
      assert.equal(contextMenuService.isImageUrl('https://example.com/photo.bmp'), true);
    });

    test('should identify data URLs and blob URLs as images', () => {
      assert.equal(contextMenuService.isImageUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='), true);
      assert.equal(contextMenuService.isImageUrl('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...'), true);
      assert.equal(contextMenuService.isImageUrl('blob:https://web.whatsapp.com/1234-5678-90ab'), true);
    });

    test('should honor mediaType or hasImageContents parameter', () => {
      assert.equal(contextMenuService.isImageUrl('https://example.com/dynamic-stream', 'image', false), true);
      assert.equal(contextMenuService.isImageUrl('https://example.com/custom-render', 'none', true), true);
    });

    test('should return false for regular web pages, documents, and invalid inputs', () => {
      assert.equal(contextMenuService.isImageUrl('https://seller.shopee.co.id/portal/order'), false);
      assert.equal(contextMenuService.isImageUrl('https://tokopedia.com/product/12345'), false);
      assert.equal(contextMenuService.isImageUrl('https://example.com/document.pdf'), false);
      assert.equal(contextMenuService.isImageUrl(''), false);
      assert.equal(contextMenuService.isImageUrl(null), false);
      assert.equal(contextMenuService.isImageUrl(undefined), false);
    });
  });

  describe('suggestFilenameFromUrl', () => {
    test('should extract clean filename from URL pathname', () => {
      const name = contextMenuService.suggestFilenameFromUrl('https://cf.shopee.co.id/file/resi_pengiriman_123.jpg?v=99');
      assert.equal(name, 'resi_pengiriman_123.jpg');
    });

    test('should sanitize special characters in filename', () => {
      const name = contextMenuService.suggestFilenameFromUrl('https://example.com/files/Order%20#123@Proof.png');
      assert.ok(!name.includes('#') && !name.includes(' '));
      assert.ok(name.endsWith('.png'));
    });

    test('should detect MIME extension from Data URLs', () => {
      const jpgName = contextMenuService.suggestFilenameFromUrl('data:image/jpeg;base64,/9j/4AAQSkZJRg==');
      assert.ok(jpgName.endsWith('.jpg'), `Expected .jpg extension, got ${jpgName}`);

      const pngName = contextMenuService.suggestFilenameFromUrl('data:image/png;base64,iVBORw0KGgo==');
      assert.ok(pngName.endsWith('.png'), `Expected .png extension, got ${pngName}`);

      const webpName = contextMenuService.suggestFilenameFromUrl('data:image/webp;base64,UklGRg==');
      assert.ok(webpName.endsWith('.webp'), `Expected .webp extension, got ${webpName}`);
    });

    test('should detect extension from binary magic bytes when URL has no extension', () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      const name = contextMenuService.suggestFilenameFromUrl('https://example.com/media/raw-asset-12345', pngBuffer);
      assert.ok(name.endsWith('.png'));
    });
  });

  describe('QR Code Generation', () => {
    test('should generate valid Data URL QR code for a given image URL', async () => {
      const testUrl = 'https://cf.shopee.co.id/file/sample_product_photo.jpg';
      const qrDataUrl = await QRCode.toDataURL(testUrl, {
        width: 300,
        margin: 2,
        errorCorrectionLevel: 'H'
      });

      assert.ok(typeof qrDataUrl === 'string');
      assert.ok(qrDataUrl.startsWith('data:image/png;base64,'));
      assert.ok(qrDataUrl.length > 100);
    });
  });

  describe('extractImageBuffer from Data URL', () => {
    test('should extract decoded buffer from Base64 Data URL', async () => {
      // 1x1 transparent PNG data URL
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const buffer = await contextMenuService.extractImageBuffer(null, dataUrl);

      assert.ok(Buffer.isBuffer(buffer));
      assert.ok(buffer.length > 0);
      // Check PNG magic header: 0x89, 'P', 'N', 'G'
      assert.equal(buffer[0], 0x89);
      assert.equal(buffer[1], 0x50);
      assert.equal(buffer[2], 0x4E);
      assert.equal(buffer[3], 0x47);
    });

    test('should return null safely for empty or invalid image URLs', async () => {
      assert.equal(await contextMenuService.extractImageBuffer(null, ''), null);
      assert.equal(await contextMenuService.extractImageBuffer(null, null), null);
    });
  });

  describe('suggestPageFilename', () => {
    test('should clean page title and append correct extension', () => {
      const pdfName = contextMenuService.suggestPageFilename('Cetak Dokumen Resi SPX #12345', '.pdf');
      assert.ok(pdfName.endsWith('.pdf'));
      assert.ok(!pdfName.includes('#'));
      assert.ok(pdfName.includes('Cetak_Dokumen_Resi_SPX'));

      const jpgName = contextMenuService.suggestPageFilename('Invoice Pesanan [Lazada]', '.jpg');
      assert.ok(jpgName.endsWith('.jpg'));
      assert.ok(!jpgName.includes('[') && !jpgName.includes(']'));
    });

    test('should provide safe timestamp fallback when title is missing or empty', () => {
      const fallbackPdf = contextMenuService.suggestPageFilename('', '.pdf');
      assert.ok(fallbackPdf.startsWith('halaman_'));
      assert.ok(fallbackPdf.endsWith('.pdf'));

      const fallbackJpg = contextMenuService.suggestPageFilename(null, 'jpg');
      assert.ok(fallbackJpg.startsWith('halaman_'));
      assert.ok(fallbackJpg.endsWith('.jpg'));
    });
  });

  describe('Page Export & Print Service Contracts', () => {
    test('should safely handle destroyed or null contents in savePageAsPdf', async () => {
      // Must not throw error
      await contextMenuService.savePageAsPdf(null, null);
      await contextMenuService.savePageAsPdf({ isDestroyed: () => true }, null);
    });

    test('should safely handle destroyed or null contents in savePageAsJpg', async () => {
      // Must not throw error
      await contextMenuService.savePageAsJpg(null, null);
      await contextMenuService.savePageAsJpg({ isDestroyed: () => true }, null);
    });

    test('should safely handle destroyed or null contents in printPage', () => {
      // Must not throw error
      contextMenuService.printPage(null, null);
      contextMenuService.printPage({ isDestroyed: () => true }, null);
    });
  });

});

