/**
 * 🍺 Beerlao Order App - Google Apps Script Backend
 * 
 * 📊 GOOGLE SHEET ID: 12CV_NOtFAsj9xZ6LnzzEqi5PjbPPVegOpFOC9B8m7gY
 * 📁 GOOGLE DRIVE FOLDER ID: 1JFlPMCT6FyANB_3XN7wFhaGIQK7NEU2x (ໂຟນເດີ "order app")
 * 
 * 🚀 ຄຸນສົມບັດ:
 * 1. ອັບໂຫຼດຮູບພາບເມນູ (Menu Images) ແລະ ຮູບພະນັກງານ (Employee Profile Photos) ເຂົ້າ Google Drive ໂຟນເດີ "order app" ໂດຍກົງ
 * 2. ສົ່ງຄືນ File ID ແລະ Direct Image URL ໃຫ້ແອັບກ່ອນບັນທຶກລົງ Google Sheet
 * 3. ສະແດງຮູບພາບຕົວຢ່າງໃນ Sheet ຜ່ານສູດ =IMAGE() ພ້ອມລິ້ງຄລິກເປີດເບິ່ງໃນ Google Drive
 */

const SPREADSHEET_ID = '12CV_NOtFAsj9xZ6LnzzEqi5PjbPPVegOpFOC9B8m7gY';
const DRIVE_FOLDER_ID = '1JFlPMCT6FyANB_3XN7wFhaGIQK7NEU2x'; // ໂຟນເດີ "order app" ຂອງທ່ານ

/**
 * ດຶງ Spreadsheet ທີ່ກ່ຽວຂ້ອງ
 */
function getTargetSpreadsheet() {
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {}
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

/**
 * 📁 ດຶງໂຟນເດີ Google Drive "order app" ຕາມ Folder ID ຂອງທ່ານ
 */
function getTargetDriveFolder() {
  const candidateIds = [
    DRIVE_FOLDER_ID,
    '1JFlPMCT6FyANB_3XN7wFhaGIQK7NEU2x',
    '1JFIPMCT6FyANB_3XN7wFhaGIQK7NEU2x'
  ];

  for (let i = 0; i < candidateIds.length; i++) {
    try {
      const folder = DriveApp.getFolderById(candidateIds[i]);
      if (folder) {
        try {
          folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (e) {}
        return folder;
      }
    } catch (err) {}
  }

  // Fallback: ຄົ້ນຫາໂຟນເດີຊື່ "order app"
  try {
    const folders = DriveApp.getFoldersByName('order app');
    if (folders.hasNext()) {
      return folders.next();
    }
  } catch (e) {}

  return DriveApp.getRootFolder();
}

/**
 * 🧪 ຟັງຊັນທົດສອບການອັບໂຫຼດລົງ Google Drive ແລະ Sheet
 * (ກົດ "Run" ຟັງຊັນນີ້ໃນ Google Apps Script ເພື່ອທົດສອບ ແລະ ອະນຸມັດສິດ Google Drive ໄດ້ທັນທີ)
 */
function testDriveAndSheetUpload() {
  Logger.log('🚀 ເລີ່ມຕົ້ນການທົດສອບ Google Drive Folder...');
  const folder = getTargetDriveFolder();
  Logger.log('📁 ໂຟນເດີ Google Drive: ' + folder.getName() + ' (ID: ' + folder.getId() + ')');

  // ທົດສອບສ້າງໄຟລ໌ຮູບພາບຕົວຢ່າງເຂົ້າ Drive ໂຟນເດີ 1JFlPMCT6FyANB_3XN7wFhaGIQK7NEU2x
  const testPixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const res = handleImageUpload({
    fileData: testPixel,
    fileName: 'Test_Beerlao_Upload',
    type: 'menu'
  });

  Logger.log('📤 ຜົນການອັບໂຫຼດ: ' + JSON.stringify(res));
  if (res && res.status === 'success') {
    Logger.log('✅ ສຳເລັດ 100%! ໄຟລ໌ຖືກສ້າງໃນ Drive: ' + res.directUrl);
  } else {
    Logger.log('❌ ບໍ່ສຳເລັດ: ' + JSON.stringify(res));
  }
  return res;
}

/**
 * 📤 Server-side Handler ສຳລັບອັບໂຫຼດຮູບພາບໂດຍກົງ (Upload Image Action)
 */
function handleImageUpload(payload) {
  const base64Data = payload.fileData || payload.image || payload.data;
  if (!base64Data || typeof base64Data !== 'string') {
    return { status: 'error', message: 'No image data received' };
  }

  // ຖ້າເປັນລິ້ງ URL ແລ້ວ ໃຫ້ສົ່ງຄືນໄດ້ເລີຍ
  if (base64Data.startsWith('http://') || base64Data.startsWith('https://')) {
    let viewUrl = base64Data;
    if (base64Data.includes('googleusercontent.com/d/')) {
      const match = base64Data.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match) viewUrl = 'https://drive.google.com/file/d/' + match[1] + '/view';
    }
    return {
      status: 'success',
      directUrl: base64Data,
      viewUrl: viewUrl,
      fileId: ''
    };
  }

  if (!base64Data.startsWith('data:image')) {
    return { status: 'error', message: 'Invalid image format. Expected data:image/...' };
  }

  try {
    const parts = base64Data.split(',');
    if (parts.length < 2) {
      return { status: 'error', message: 'Malformed image data' };
    }

    const mimeMatch = parts[0].match(/data:(image\/[a-zA-Z0-9.+]+);base64/);
    const mimeType = mimeMatch ? mimeMatch[1].toLowerCase() : 'image/jpeg';

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(mimeType)) {
      return { status: 'error', message: 'Unsupported image type: ' + mimeType };
    }

    const decoded = Utilities.base64Decode(parts[1]);
    if (decoded.length > 10 * 1024 * 1024) {
      return { status: 'error', message: 'Image size exceeds maximum limit of 10MB' };
    }

    const ext = mimeType === 'image/png' ? 'png' : (mimeType === 'image/webp' ? 'webp' : (mimeType === 'image/gif' ? 'gif' : 'jpg'));
    const rawPrefix = payload.fileName || payload.name || payload.type || 'upload';
    const safePrefix = rawPrefix.replace(/[^a-zA-Z0-9_\u0E80-\u0EFF-]/g, '_').substring(0, 35);
    const timestampStr = Utilities.formatDate(new Date(), 'Asia/Vientiane', 'yyyyMMdd_HHmmss');
    const fileName = safePrefix + '_' + timestampStr + '.' + ext;

    const blob = Utilities.newBlob(decoded, mimeType, fileName);
    const folder = getTargetDriveFolder();
    const file = folder.createFile(blob);

    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) {
      Logger.log('Set file sharing error: ' + shareErr);
    }

    const fileId = file.getId();
    const directUrl = 'https://lh3.googleusercontent.com/d/' + fileId;
    const viewUrl = 'https://drive.google.com/file/d/' + fileId + '/view';

    return {
      status: 'success',
      fileId: fileId,
      directUrl: directUrl,
      viewUrl: viewUrl,
      fileName: fileName
    };
  } catch (err) {
    Logger.log('Upload error: ' + err);
    return { status: 'error', message: err.toString() };
  }
}

/**
 * 💾 ບັນທຶກຮູບພາບ Base64 ລົງໃນໂຟນເດີ Google Drive "order app" (Internal Helper)
 */
function saveBase64ImageToDrive(base64Data, filenamePrefix) {
  if (!base64Data || typeof base64Data !== 'string') return null;
  if (base64Data.startsWith('http://') || base64Data.startsWith('https://')) {
    let viewUrl = base64Data;
    if (base64Data.includes('googleusercontent.com/d/')) {
      const match = base64Data.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match) viewUrl = 'https://drive.google.com/file/d/' + match[1] + '/view';
    }
    return { directUrl: base64Data, viewUrl: viewUrl, fileId: '' };
  }

  const res = handleImageUpload({ fileData: base64Data, fileName: filenamePrefix });
  if (res && res.status === 'success') {
    return res;
  }
  return null;
}

/**
 * 🍺 ສ້າງເມນູລັດໃນ Google Sheets ເມື່ອເປີດໄຟລ໌
 */
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('🍺 Beerlao POS')
      .addItem('🚀 ສ້າງຕາຕະລາງທັງໝົດ (Orders, Cashiers, Menu)', 'setupAllTables')
      .addSeparator()
      .addItem('🍽️ ສ້າງ/ຣີເຊັດຕາຕະລາງເມນູສິນຄ້າ (Setup Menu)', 'setupMenuTable')
      .addItem('👥 ສ້າງ/ຣີເຊັດຕາຕະລາງພະນັກງານ (Setup Cashiers)', 'setupCashiersTable')
      .addItem('📦 ສ້າງ/ຣີເຊັດຕາຕະລາງອໍເດີ (Setup Orders)', 'setupOrdersTable')
      .addToUi();
  } catch (e) {
    Logger.log('onOpen error: ' + e);
  }
}

/**
 * 🚀 ຟັງຊັນສ້າງຕາຕະລາງທັງໝົດ (Orders, Cashiers, Menu)
 */
function setupAllTables() {
  const ss = getTargetSpreadsheet();
  setupCashiersTable(ss);
  setupOrdersTable(ss);
  setupMenuTable(ss);

  try {
    const defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('ແຜ່ນງານ1') || ss.getSheetByName('ຊີດ1');
    if (defaultSheet && ss.getSheets().length > 3) {
      ss.deleteSheet(defaultSheet);
    }
  } catch (e) {}

  try {
    SpreadsheetApp.getUi().alert('✅ ສຳເລັດ!', 'ລະບົບໄດ້ສ້າງຕາຕະລາງ "Orders", "Cashiers" ແລະ "Menu" ຮຽບຮ້ອຍແລ້ວ!', SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (e) {}

  return { status: 'success', message: 'All tables created successfully' };
}

/**
 * 🍽️ ສ້າງຕາຕະລາງເມນູສິນຄ້າ (Menu Table)
 */
function setupMenuTable(spreadsheet) {
  const ss = spreadsheet || getTargetSpreadsheet();
  let sheet = ss.getSheetByName('Menu');
  if (!sheet) {
    sheet = ss.insertSheet('Menu');
  }

  const headers = [
    'ລະຫັດສິນຄ້າ (Product ID)',
    'ຊື່ເມນູ (Product Name)',
    'ຊື່ພາສາອັງກິດ (English Name)',
    'ລາຍລະອຽດ (Description)',
    'ໝວດໝູ່ (Category)',
    'ລາຄາ / ກີບ (Price)',
    'ປ້າຍພິເສດ (Badge Text)',
    'ປະເພດປ້າຍ (Badge Type)',
    'ຮູບພາບຕົວຢ່າງ (Preview)',
    'ລິ້ງຮູບພາບ (Image URL)',
    'ເບິ່ງໄຟລ໌ໃນ Drive (Open in Drive)',
    'ວັນທີອັບເດດລ່າສຸດ (Updated At)'
  ];

  sheet.clearContents();
  sheet.appendRow(headers);

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#006c49')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 35);
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(9, 75);

  const nowStr = new Date().toLocaleString('lo-LA', { timeZone: 'Asia/Vientiane' });
  const initialProducts = [
    ['item-1', 'ກາເຟລາວເຢັນ', 'Iced Lao Coffee', 'ເມັດກາເຟໂບລະເວນ', 'drinks', 25000, 'ຂາຍດີທີ່ສຸດ', 'bestseller', '', 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&auto=format&fit=crop&q=80', '', nowStr],
    ['item-2', 'ຊານົມໄຂ່ມຸກ ໄຕ້ຫວັນ', 'Taiwan Milk Tea', 'ຫວານປານກາງ 50%', 'drinks', 28000, 'ຫວານ 50%', 'sweet', '', 'https://images.unsplash.com/photo-1558857563-b37cf5287f3b?w=500&auto=format&fit=crop&q=80', '', nowStr],
    ['item-3', 'ເຝີຊີ້ນງົວພິເສດ', 'Special Beef Pho', 'ນ້ຳຊຸບຕົ້ມກະດູກ 12 ຊມ', 'food', 45000, 'ແນະນຳ', 'recommended', '', 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500&auto=format&fit=crop&q=80', '', nowStr],
    ['item-4', 'ກະເພົາໝູກອບ ໄຂ່ດາວ', 'Crispy Pork Kra Pao', 'ໝູກອບໜັງຟູ ໃສ່ໄຂ່ດາວ', 'food', 38000, '', '', '', 'https://images.unsplash.com/photo-1562967914-608f82629710?w=500&auto=format&fit=crop&q=80', '', nowStr],
    ['item-5', 'ຕຳໝາກຫຸ່ງ ຫຼວງພະບາງ', 'Papaya Salad', 'ໃສ່ປາແດກນົວໆ ເຜັດກາງ', 'food', 30000, '', '', '', 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=500&auto=format&fit=crop&q=80', '', nowStr],
    ['item-6', 'ເຂົ້າຜັດລວມມິດ', 'Fried Rice', 'ຜັດກະທະຮ້ອນໆ ຫອມກິ່ນກະທະ', 'food', 35000, '', '', '', 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&auto=format&fit=crop&q=80', '', nowStr]
  ];

  initialProducts.forEach(function(row) {
    sheet.appendRow(row);
  });

  const dataRange = sheet.getRange(2, 1, initialProducts.length, headers.length);
  dataRange.setVerticalAlignment('middle');
  sheet.setRowHeights(2, initialProducts.length, 55);

  for (let c = 1; c <= headers.length; c++) {
    sheet.autoResizeColumn(c);
  }
  sheet.setColumnWidth(9, 75);

  return sheet;
}

/**
 * 👥 ສ້າງຕາຕະລາງພະນັກງານເກັບເງິນ (Cashiers Table)
 */
function setupCashiersTable(spreadsheet) {
  const ss = spreadsheet || getTargetSpreadsheet();
  let sheet = ss.getSheetByName('Cashiers');
  if (!sheet) {
    sheet = ss.insertSheet('Cashiers');
  }

  const headers = [
    'ລະຫັດພະນັກງານ (ID)',
    'ຊື່ພະນັກງານເກັບເງິນ (Name)',
    'ສີປະຈຳຕົວ (Color)',
    'ຮູບພາບຕົວຢ່າງ (Preview)',
    'ລິ້ງຮູບພາບ (Photo URL)',
    'ເບິ່ງໄຟລ໌ໃນ Drive (Open in Drive)',
    'ວັນທີອັບເດດລ່າສຸດ (Updated At)'
  ];

  sheet.clearContents();
  sheet.appendRow(headers);

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#006c49')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 35);
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(4, 75);

  const nowStr = new Date().toLocaleString('lo-LA', { timeZone: 'Asia/Vientiane' });
  const initialCashiers = [
    ['cashier_1', 'ພະນັກງານ 01', '#006c49', '', '', '', nowStr],
    ['cashier_2', 'ພະນັກງານ 02', '#2563eb', '', '', '', nowStr],
    ['cashier_3', 'ພະນັກງານ 03', '#ea580c', '', '', '', nowStr]
  ];

  initialCashiers.forEach(function(row) {
    sheet.appendRow(row);
  });

  const dataRange = sheet.getRange(2, 1, initialCashiers.length, headers.length);
  dataRange.setVerticalAlignment('middle');
  sheet.setRowHeights(2, initialCashiers.length, 50);

  for (let c = 1; c <= headers.length; c++) {
    sheet.autoResizeColumn(c);
  }
  sheet.setColumnWidth(4, 75);

  return sheet;
}

/**
 * 📦 ສ້າງຕາຕະລາງອໍເດີ (Orders Table)
 */
function setupOrdersTable(spreadsheet) {
  const ss = spreadsheet || getTargetSpreadsheet();
  let sheet = ss.getSheetByName('Orders');
  if (!sheet) {
    sheet = ss.insertSheet('Orders');
  }

  const headers = [
    'ລະຫັດບິນ (Order ID)',
    'ວັນທີ-ເວລາ',
    'ຊື່ລູກຄ້າ',
    'ເບີໂທ',
    'ລາຍການສິນຄ້າ',
    'ຈຳນວນລວມ',
    'ຍອດລວມ (ກີບ)',
    'ສ່ວນຫຼຸດ',
    'ຍອດສຸດທິ (ກີບ)',
    'ຮັບເງິນສົດ',
    'ເງິນທອນ',
    'ສະຖານະ',
    'ຮູບແບບສົ່ງ',
    'ໝາຍເຫດ',
    'GPS Map Link',
    'ຮູບໜ້າຮ້ານ/ຫຼັກຖານ'
  ];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#006c49')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
    sheet.setRowHeight(1, 35);
    sheet.setFrozenRows(1);
    for (let c = 1; c <= headers.length; c++) sheet.autoResizeColumn(c);
  }

  return sheet;
}

/**
 * ຮັບ Request ແບບ GET
 */
function doGet(e) {
  if (e && e.parameter) {
    if (e.parameter.action === 'ping') {
      return jsonResponse({
        status: 'success',
        version: 'v2.2-drive-active',
        timestamp: new Date().toISOString(),
        message: 'Google Sheet & Drive Connected successfully!',
        sheetId: SPREADSHEET_ID,
        folderId: DRIVE_FOLDER_ID
      });
    }

    if (e.parameter.action === 'test_drive') {
      try {
        const testRes = testDriveAndSheetUpload();
        return jsonResponse({
          status: 'success',
          version: 'v2.2-drive-active',
          driveFolderId: DRIVE_FOLDER_ID,
          result: testRes
        });
      } catch (err) {
        return jsonResponse({
          status: 'error',
          version: 'v2.2-drive-active',
          driveFolderId: DRIVE_FOLDER_ID,
          error: err.toString(),
          hint: 'DriveApp permission not granted yet! Open Apps Script editor and click Run on testDriveAndSheetUpload to grant access.'
        });
      }
    }

    if (e.parameter.action === 'setup' || e.parameter.action === 'setup_tables') {
      const res = setupAllTables();
      return jsonResponse({
        status: 'success',
        message: 'ຕາຕະລາງ Orders, Cashiers ແລະ Menu ຖືກສ້າງຮຽບຮ້ອຍແລ້ວ!',
        sheetId: SPREADSHEET_ID,
        result: res
      });
    }

    if (e.parameter.action === 'get_menu' || e.parameter.action === 'get_products') {
      return jsonResponse(getMenuFromSheet());
    }

    if (e.parameter.action === 'get_cashiers') {
      return jsonResponse(getCashiersFromSheet());
    }

    // ດຶງ ແລະ ຈັບຄູ່ຮູບຈາກ Google Drive ໂຟນເດີ "order app" ມາໃສ່ເມນູໃນ Sheet
    if (e.parameter.action === 'sync_drive_images' || e.parameter.action === 'sync_images') {
      return jsonResponse(syncDriveImagesToSheet());
    }

    // ລາຍການໄຟລ໌ຮູບທັງໝົດໃນ Google Drive ໂຟນເດີ "order app"
    if (e.parameter.action === 'list_drive_images' || e.parameter.action === 'get_drive_photos') {
      return jsonResponse(listDriveImages());
    }

    // ກຳນົດຮູບຈາກ Drive ໃຫ້ສິນຄ້າໂດຍກົງ
    if (e.parameter.action === 'assign_drive_image') {
      return jsonResponse(assignDriveImageToProduct(e.parameter.productId, e.parameter.fileId));
    }

    if (e.parameter.format === 'json') {
      return jsonResponse({
        status: 'online',
        app: 'Beerlao Order POS - Google Sheet & Drive Integration Backend',
        sheetId: SPREADSHEET_ID,
        folderId: DRIVE_FOLDER_ID,
        timestamp: new Date().toISOString()
      });
    }
  }

  const html = '<!DOCTYPE html>' +
    '<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Beerlao Order App - Integration Backend</title>' +
    '<style>' +
    'body { font-family: system-ui, -apple-system, sans-serif; background: #faf8ff; color: #131b2e; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }' +
    '.card { background: white; border-radius: 28px; padding: 36px 28px; max-width: 460px; width: 100%; box-shadow: 0 12px 36px rgba(0,0,0,0.06); text-align: center; border: 1px solid #e2e8f0; }' +
    '.badge { display: inline-flex; align-items: center; gap: 8px; background: #ecfdf5; color: #006c49; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 700; margin-bottom: 20px; border: 1px solid #a7f3d0; }' +
    '.dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; }' +
    'h1 { margin: 0 0 10px; font-size: 26px; color: #006c49; font-weight: 800; letter-spacing: -0.5px; }' +
    'p { margin: 0 0 24px; font-size: 14px; color: #64748b; line-height: 1.6; }' +
    '.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; background: #006c49; color: white; padding: 15px 20px; border-radius: 18px; font-size: 16px; font-weight: 700; text-decoration: none; box-sizing: border-box; box-shadow: 0 6px 16px rgba(0,108,73,0.25); }' +
    '.btn-sub { margin-top: 12px; display: inline-flex; align-items: center; justify-content: center; width: 100%; background: #f1f5f9; color: #334155; padding: 13px 20px; border-radius: 18px; font-size: 14px; font-weight: 600; text-decoration: none; box-sizing: border-box; }' +
    '.info { margin-top: 24px; background: #f8fafc; border-radius: 18px; padding: 16px; text-align: left; font-size: 12px; color: #475569; border: 1px solid #f1f5f9; }' +
    '.info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }' +
    '</style></head><body>' +
    '<div class="card">' +
    '  <div class="badge"><span class="dot"></span> ລະບົບ Backend Google Sheet & Drive ພ້ອມໃຊ້ງານ</div>' +
    '  <h1>🍺 Beerlao Order POS</h1>' +
    '  <p>ລິ້ງນີ້ແມ່ນລະບົບ API ສຳລັບບັນທຶກອໍເດີ, ເມນູ, ພະນັກງານ ແລະ ຮູບພາບລົງ Google Sheet & Drive (ໂຟນເດີ "order app").<br>ກະລຸນາກົດປຸ່ມຂ້າງລຸ່ມເພື່ອເຂົ້າສູ່ໜ້າແອັບສັ່ງຊື້:</p>' +
    '  <a href="https://phetsamoneken-spec.github.io/oder-app/" target="_top" class="btn">🚀 ເປີດໜ້າແອັບ Beerlao Order App</a>' +
    '  <a href="https://docs.google.com/spreadsheets/d/' + SPREADSHEET_ID + '/edit" target="_blank" class="btn-sub">📊 ເປີດ Google Sheet ຂອງທ່ານ</a>' +
    '  <a href="https://drive.google.com/drive/folders/' + DRIVE_FOLDER_ID + '" target="_blank" class="btn-sub">📁 ເປີດໂຟນເດີ Google Drive "order app"</a>' +
    '  <div class="info">' +
    '    <div class="info-row"><span>ໜ້າແອັບຫຼັກ (PWA):</span><strong style="color:#006c49;">GitHub Pages</strong></div>' +
    '    <div class="info-row"><span>ຕາຕະລາງໃນ Sheet:</span><strong>Orders | Cashiers | Menu</strong></div>' +
    '    <div class="info-row"><span>ໂຟນເດີ Google Drive:</span><strong style="color:#10b981;">order app (1JFlPMCT6FyANB_3XN7wFhaGIQK7NEU2x)</strong></div>' +
    '    <div class="info-row"><span>ສະຖານະ API:</span><strong style="color:#10b981;">Online 100%</strong></div>' +
    '  </div>' +
    '</div></body></html>';

  return HtmlService.createHtmlOutput(html)
    .setTitle('Beerlao Order App')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * ຮັບ Request ແບບ POST
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(45000);

  try {
    let rawData = null;
    if (e && e.postData && e.postData.contents) {
      rawData = e.postData.contents;
    } else if (e && e.parameter && e.parameter.data) {
      rawData = e.parameter.data;
    }

    if (!rawData) {
      return jsonResponse({ status: 'error', message: 'No payload received' });
    }

    const payload = JSON.parse(rawData);

    // 0. ອັບໂຫຼດຮູບພາບໂດຍກົງ (Direct Image Upload Action to Google Drive)
    if (payload.action === 'upload_image' || payload.action === 'uploadImage') {
      const res = handleImageUpload(payload);
      return jsonResponse(res);
    }

    // 1. ສັ່ງສ້າງຕາຕະລາງ
    if (payload.action === 'setup_tables' || payload.action === 'setup') {
      return jsonResponse(setupAllTables());
    }

    // 2. ບັນທຶກ ແລະ ອັບເດດເມນູສິນຄ້າ
    if (payload.action === 'save_single_product' || (payload.action === 'save_product' && payload.product)) {
      return jsonResponse(saveSingleProductFromClient(payload.product));
    }
    if (payload.action === 'save_products' || payload.action === 'saveProducts' || payload.action === 'save_menu' || payload.action === 'sync_menu') {
      const products = payload.products || payload.items || [];
      return jsonResponse(saveProductsFromClient(products));
    }

    // 3. ບັນທຶກ ແລະ ອັບເດດລາຍຊື່ພະນັກງານເກັບເງິນ
    if (payload.action === 'save_single_cashier' || (payload.action === 'save_cashier' && payload.cashier)) {
      return jsonResponse(saveSingleCashierFromClient(payload.cashier));
    }
    if (payload.action === 'save_cashiers' || payload.action === 'saveCashiers' || payload.action === 'sync_cashiers') {
      const cashiers = payload.cashiers || [];
      return jsonResponse(saveCashiersFromClient(cashiers));
    }

    // 4. ດຶງຂໍ້ມູນ
    if (payload.action === 'get_menu' || payload.action === 'get_products') {
      return jsonResponse(getMenuFromSheet());
    }
    if (payload.action === 'get_cashiers') {
      return jsonResponse(getCashiersFromSheet());
    }

    // ດຶງ ແລະ ຈັບຄູ່ຮູບຈາກ Google Drive ໂຟນເດີ "order app" ມາໃສ່ເມນູໃນ Sheet
    if (payload.action === 'sync_drive_images' || payload.action === 'sync_images') {
      return jsonResponse(syncDriveImagesToSheet());
    }

    // ລາຍການໄຟລ໌ຮູບທັງໝົດໃນ Google Drive ໂຟນເດີ "order app"
    if (payload.action === 'list_drive_images' || payload.action === 'get_drive_photos') {
      return jsonResponse(listDriveImages());
    }

    // ກຳນົດຮູບຈາກ Drive ໃຫ້ສິນຄ້າໂດຍກົງ
    if (payload.action === 'assign_drive_image') {
      return jsonResponse(assignDriveImageToProduct(payload.productId, payload.fileId));
    }

    // 5. ອັບເດດສະຖານະອໍເດີ
    if (payload.action === 'update_status' || payload.action === 'updateStatus') {
      const statusText = payload.collector ? (payload.status + ' (' + payload.collector + ')') : payload.status;
      return jsonResponse(updateOrderStatusFromClient(payload.orderId, statusText));
    }

    // 6. ບັນທຶກອໍເດີໃໝ່
    if (payload.action === 'save_order' || payload.action === 'saveOrder' || payload.items || payload.order) {
      const order = payload.order || payload;
      return jsonResponse(saveOrderFromClient(order));
    }

    return jsonResponse({ status: 'error', message: 'Unknown or unsupported action: ' + payload.action });

  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * 🍽️ Function ບັນທຶກ ຫຼື ອັບເດດເມນູສິນຄ້າ 1 ລາຍການ (Add / Update Single Product)
 * ປັບປຸງແຖວເດີມ (ຖ້າມີ ID ເດີມ) ຫຼື ເພີ່ມແຖວໃໝ່ ພ້ອມອັບໂຫຼດຮູບເຂົ້າ Drive
 */
function saveSingleProductFromClient(p) {
  if (!p) return { status: 'error', message: 'No product payload provided' };
  const lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    const ss = getTargetSpreadsheet();
    let sheet = ss.getSheetByName('Menu');
    if (!sheet) {
      sheet = setupMenuTable(ss);
    }

    let imageUrl = p.image || '';
    let driveViewUrl = p.driveViewUrl || '';

    // ລ້າງຄ່າ [Image Data Base64] ເກົ່າອອກ
    if (imageUrl === '[Image Data Base64]' || imageUrl === '[Base64 Image]') {
      imageUrl = '';
    }

    // ຖ້າເປັນ Base64 ໃຫ້ອັບໂຫຼດລົງ Google Drive "order app" (Folder ID: 1JFlPMCT6FyANB_3XN7wFhaGIQK7NEU2x)
    if (imageUrl && imageUrl.startsWith('data:image')) {
      const driveRes = saveBase64ImageToDrive(imageUrl, 'Menu_' + (p.name || p.id));
      if (driveRes) {
        imageUrl = driveRes.directUrl;
        driveViewUrl = driveRes.viewUrl;
      }
    } else if (imageUrl && imageUrl.includes('googleusercontent.com/d/')) {
      const match = imageUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match) {
        driveViewUrl = 'https://drive.google.com/file/d/' + match[1] + '/view';
      }
    }

    const nowStr = new Date().toLocaleString('lo-LA', { timeZone: 'Asia/Vientiane' });
    const productId = String(p.id || ('item-' + Date.now())).trim();
    const data = sheet.getDataRange().getValues();
    let targetRow = -1;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === productId) {
        targetRow = i + 1;
        break;
      }
    }

    const isUpdate = targetRow > 0;
    // ຮັກສາຮູບພາບເກົ່າໃນ Sheet ໄວ້ ຖ້າແກ້ໄຂເມນູ ແລະ ບໍ່ໄດ້ເລືອກຮູບໃໝ່ (Requirement 6)
    if (isUpdate && !imageUrl) {
      const existingRow = data[targetRow - 1];
      const existingImg = String(existingRow[9] || '').trim();
      const existingDrive = String(existingRow[10] || '').trim();
      if (existingImg && existingImg !== '[Image Data Base64]' && existingImg !== '[Base64 Image]') {
        imageUrl = existingImg;
      }
      if (existingDrive) {
        driveViewUrl = existingDrive;
      }
    }

    // ຮູບພາບຖືກບັນທຶກລົງໃນ Google Drive ເທົ່ານັ້ນ, ບໍ່ບັນທຶກຮູບພາບລົງ Sheet
    const previewFormula = '';

    const rowData = [
      productId,
      p.name || '',
      p.nameEn || '',
      p.sub || '',
      p.category || 'drinks',
      Number(p.price) || 0,
      p.badgeText || '',
      p.badgeType || '',
      previewFormula,
      imageUrl,
      driveViewUrl,
      nowStr
    ];

    if (isUpdate) {
      sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
      sheet.setRowHeight(sheet.getLastRow(), 55);
    }

    return {
      status: 'success',
      action: isUpdate ? 'updated' : 'inserted',
      product: {
        id: productId,
        name: p.name || '',
        nameEn: p.nameEn || '',
        sub: p.sub || '',
        category: p.category || 'drinks',
        price: Number(p.price) || 0,
        badgeText: p.badgeText || '',
        badgeType: p.badgeType || '',
        image: imageUrl,
        driveViewUrl: driveViewUrl
      }
    };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 👥 Function ບັນທຶກ ຫຼື ອັບເດດພະນັກງານ 1 ທ່ານ (Add / Update Single Cashier)
 * ປັບປຸງແຖວເດີມ (ຖ້າມີ ID ເດີມ) ຫຼື ເພີ່ມແຖວໃໝ່ ພ້ອມອັບໂຫຼດຮູບເຂົ້າ Drive
 */
function saveSingleCashierFromClient(c) {
  if (!c) return { status: 'error', message: 'No cashier payload provided' };
  const lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    const ss = getTargetSpreadsheet();
    let sheet = ss.getSheetByName('Cashiers');
    if (!sheet) {
      sheet = setupCashiersTable(ss);
    }

    let photoUrl = c.photo || '';
    let driveViewUrl = c.driveViewUrl || '';

    if (photoUrl === '[Image Data Base64]' || photoUrl === '[Base64 Image]') {
      photoUrl = '';
    }

    // ຖ້າເປັນ Base64 ໃຫ້ອັບໂຫຼດລົງ Google Drive "order app" (Folder ID: 1JFlPMCT6FyANB_3XN7wFhaGIQK7NEU2x)
    if (photoUrl && photoUrl.startsWith('data:image')) {
      const driveRes = saveBase64ImageToDrive(photoUrl, 'Staff_' + (c.name || c.id));
      if (driveRes) {
        photoUrl = driveRes.directUrl;
        driveViewUrl = driveRes.viewUrl;
      }
    } else if (photoUrl && photoUrl.includes('googleusercontent.com/d/')) {
      const match = photoUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match) {
        driveViewUrl = 'https://drive.google.com/file/d/' + match[1] + '/view';
      }
    }

    const nowStr = new Date().toLocaleString('lo-LA', { timeZone: 'Asia/Vientiane' });
    const cashierId = String(c.id || ('cashier_' + Date.now())).trim();
    const data = sheet.getDataRange().getValues();
    let targetRow = -1;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === cashierId) {
        targetRow = i + 1;
        break;
      }
    }

    const isUpdate = targetRow > 0;
    // ຮັກສາຮູບພາບເກົ່າໃນ Sheet ໄວ້ ຖ້າແກ້ໄຂພະນັກງານ ແລະ ບໍ່ໄດ້ເລືອກຮູບໃໝ່ (Requirement 6)
    if (isUpdate && !photoUrl) {
      const existingRow = data[targetRow - 1];
      const existingPhoto = String(existingRow[4] || '').trim();
      const existingDrive = String(existingRow[5] || '').trim();
      if (existingPhoto && existingPhoto !== '[Image Data Base64]' && existingPhoto !== '[Base64 Image]') {
        photoUrl = existingPhoto;
      }
      if (existingDrive) {
        driveViewUrl = existingDrive;
      }
    }

    // ຮູບພາບຖືກບັນທຶກລົງໃນ Google Drive ເທົ່ານັ້ນ, ບໍ່ບັນທຶກຮູບພາບລົງ Sheet
    const previewFormula = '';

    const rowData = [
      cashierId,
      c.name || '',
      c.color || '#006c49',
      previewFormula,
      photoUrl,
      driveViewUrl,
      nowStr
    ];

    if (isUpdate) {
      sheet.getRange(targetRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
      sheet.setRowHeight(sheet.getLastRow(), 50);
    }

    return {
      status: 'success',
      action: isUpdate ? 'updated' : 'inserted',
      cashier: {
        id: cashierId,
        name: c.name || '',
        color: c.color || '#006c49',
        photo: photoUrl,
        driveViewUrl: driveViewUrl
      }
    };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 🍽️ Function ບັນທຶກ ແລະ ອັບເດດເມນູສິນຄ້າ ພ້ອມຮູບພາບລົງ Google Drive "order app" & Sheet "Menu"
 */
function saveProductsFromClient(products) {
  const lock = LockService.getScriptLock();
  lock.tryLock(45000);

  try {
    const ss = getTargetSpreadsheet();
    let sheet = ss.getSheetByName('Menu');

    if (!sheet) {
      sheet = ss.insertSheet('Menu');
    }

    const headers = [
      'ລະຫັດສິນຄ້າ (Product ID)',
      'ຊື່ເມນູ (Product Name)',
      'ຊື່ພາສາອັງກິດ (English Name)',
      'ລາຍລະອຽດ (Description)',
      'ໝວດໝູ່ (Category)',
      'ລາຄາ / ກີບ (Price)',
      'ປ້າຍພິເສດ (Badge Text)',
      'ປະເພດປ້າຍ (Badge Type)',
      'ຮູບພາບຕົວຢ່າງ (Preview)',
      'ລິ້ງຮູບພາບ (Image URL)',
      'ເບິ່ງໄຟລ໌ໃນ Drive (Open in Drive)',
      'ວັນທີອັບເດດລ່າສຸດ (Updated At)'
    ];

    sheet.clearContents();
    sheet.appendRow(headers);

    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#006c49')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
    sheet.setRowHeight(1, 35);
    sheet.setFrozenRows(1);

    const nowStr = new Date().toLocaleString('lo-LA', { timeZone: 'Asia/Vientiane' });
    const updatedProducts = [];

    (products || []).forEach(function(p, idx) {
      let imageUrl = p.image || '';
      let driveViewUrl = '';

      // ລ້າງຄ່າ [Image Data Base64] ເກົ່າອອກ
      if (imageUrl === '[Image Data Base64]' || imageUrl === '[Base64 Image]') {
        imageUrl = '';
      }

      // ຖ້າເປັນຮູບ Base64 ໃຫ້ອັບໂຫຼດລົງໃນໂຟນເດີ Google Drive "order app"
      if (imageUrl && imageUrl.startsWith('data:image')) {
        const driveRes = saveBase64ImageToDrive(imageUrl, 'Menu_' + (p.name || p.id));
        if (driveRes) {
          imageUrl = driveRes.directUrl;
          driveViewUrl = driveRes.viewUrl;
        }
      } else if (imageUrl && imageUrl.includes('googleusercontent.com/d/')) {
        const match = imageUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match) {
          driveViewUrl = 'https://drive.google.com/file/d/' + match[1] + '/view';
        }
      }

      // ຮູບພາບຖືກບັນທຶກລົງໃນ Google Drive ເທົ່ານັ້ນ, ບໍ່ບັນທຶກຮູບພາບລົງ Sheet
      const previewFormula = '';

      sheet.appendRow([
        p.id || ('item-' + (idx + 1)),
        p.name || '',
        p.nameEn || '',
        p.sub || '',
        p.category || 'drinks',
        Number(p.price) || 0,
        p.badgeText || '',
        p.badgeType || '',
        previewFormula,
        imageUrl,
        driveViewUrl,
        nowStr
      ]);

      updatedProducts.push({
        id: p.id || ('item-' + (idx + 1)),
        name: p.name || '',
        nameEn: p.nameEn || '',
        sub: p.sub || '',
        category: p.category || 'drinks',
        price: Number(p.price) || 0,
        badgeText: p.badgeText || '',
        badgeType: p.badgeType || '',
        image: imageUrl
      });
    });

    if (products && products.length > 0) {
      const dataRange = sheet.getRange(2, 1, products.length, headers.length);
      dataRange.setVerticalAlignment('middle');
      sheet.setRowHeights(2, products.length, 55);
    }

    for (let c = 1; c <= headers.length; c++) {
      sheet.autoResizeColumn(c);
    }
    sheet.setColumnWidth(9, 75);

    return {
      status: 'success',
      message: 'Menu and Images saved to Google Drive "order app" and Google Sheet successfully',
      count: products.length,
      products: updatedProducts
    };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 👥 Function ບັນທຶກ ແລະ ອັບເດດລາຍຊື່ພະນັກງານເກັບເງິນ ພ້ອມຮູບພາບລົງ Google Drive "order app" & Sheet "Cashiers"
 */
function saveCashiersFromClient(cashiers) {
  const lock = LockService.getScriptLock();
  lock.tryLock(45000);

  try {
    const ss = getTargetSpreadsheet();
    let sheet = ss.getSheetByName('Cashiers');

    if (!sheet) {
      sheet = ss.insertSheet('Cashiers');
    }

    const headers = [
      'ລະຫັດພະນັກງານ (ID)',
      'ຊື່ພະນັກງານເກັບເງິນ (Name)',
      'ສີປະຈຳຕົວ (Color)',
      'ຮູບພາບຕົວຢ່າງ (Preview)',
      'ລິ້ງຮູບພາບ (Photo URL)',
      'ເບິ່ງໄຟລ໌ໃນ Drive (Open in Drive)',
      'ວັນທີອັບເດດລ່າສຸດ (Updated At)'
    ];

    sheet.clearContents();
    sheet.appendRow(headers);

    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#006c49')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');
    sheet.setRowHeight(1, 35);
    sheet.setFrozenRows(1);

    const nowStr = new Date().toLocaleString('lo-LA', { timeZone: 'Asia/Vientiane' });
    const updatedCashiers = [];

    (cashiers || []).forEach(function(c, idx) {
      let photoUrl = c.photo || '';
      let driveViewUrl = '';

      if (photoUrl === '[Image Data Base64]' || photoUrl === '[Base64 Image]') {
        photoUrl = '';
      }

      // ຖ້າເປັນຮູບພາບ Base64 ທີ່ຖ່າຍ ຫຼື ອັບໂຫຼດມາ ໃຫ້ບັນທຶກລົງໃນໂຟນເດີ Google Drive "order app"
      if (photoUrl && photoUrl.startsWith('data:image')) {
        const driveRes = saveBase64ImageToDrive(photoUrl, 'Staff_' + (c.name || c.id));
        if (driveRes) {
          photoUrl = driveRes.directUrl;
          driveViewUrl = driveRes.viewUrl;
        }
      } else if (photoUrl && photoUrl.includes('googleusercontent.com/d/')) {
        const match = photoUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match) {
          driveViewUrl = 'https://drive.google.com/file/d/' + match[1] + '/view';
        }
      }

      // ຮູບພາບຖືກບັນທຶກລົງໃນ Google Drive ເທົ່ານັ້ນ, ບໍ່ບັນທຶກຮູບພາບລົງ Sheet
      const previewFormula = '';

      sheet.appendRow([
        c.id || ('cashier_' + (idx + 1)),
        c.name || '',
        c.color || '#006c49',
        previewFormula,
        photoUrl,
        driveViewUrl,
        nowStr
      ]);

      updatedCashiers.push({
        id: c.id || ('cashier_' + (idx + 1)),
        name: c.name || '',
        color: c.color || '#006c49',
        photo: photoUrl
      });
    });

    if (cashiers && cashiers.length > 0) {
      const dataRange = sheet.getRange(2, 1, cashiers.length, headers.length);
      dataRange.setVerticalAlignment('middle');
      sheet.setRowHeights(2, cashiers.length, 50);
    }

    for (let c = 1; c <= headers.length; c++) {
      sheet.autoResizeColumn(c);
    }
    sheet.setColumnWidth(4, 75);

    return {
      status: 'success',
      message: 'Cashiers and Photos saved to Google Drive "order app" and Google Sheet successfully',
      count: cashiers.length,
      cashiers: updatedCashiers
    };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 📦 Function ບັນທຶກອໍເດີໃໝ່ລົງ Sheet "Orders"
 */
function saveOrderFromClient(order) {
  const lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    const ss = getTargetSpreadsheet();
    let sheet = ss.getSheetByName('Orders');

    if (!sheet) {
      sheet = setupOrdersTable(ss);
    }

    const itemsText = (order.items || []).map(function(it) {
      return (it.productName || it.name || '') + ' (' + (it.quantity || 1) + ')';
    }).join(', ');

    const totalQty = (order.items || []).reduce(function(sum, it) {
      return sum + (it.quantity || 1);
    }, 0);

    const mapLink = (order.location && order.location.lat) 
      ? ('https://www.google.com/maps?q=' + order.location.lat + ',' + order.location.lng) 
      : '';
    
    let photoDisplay = 'ບໍ່ມີຮູບ';
    if (order.storePhoto && typeof order.storePhoto === 'string') {
      if (order.storePhoto.startsWith('data:image')) {
        const driveRes = saveBase64ImageToDrive(order.storePhoto, 'OrderProof_' + (order.id || Date.now()));
        if (driveRes) {
          photoDisplay = driveRes.directUrl;
        } else {
          photoDisplay = 'ອັບໂຫຼດຮູບແລ້ວ';
        }
      } else {
        photoDisplay = order.storePhoto;
      }
    }

    sheet.appendRow([
      order.id || ('ORD-' + Date.now()),
      order.createdAt || new Date().toLocaleString('lo-LA', { timeZone: 'Asia/Vientiane' }),
      order.customerName || order.collector || 'ລູກຄ້າທົ່ວໄປ',
      order.customerPhone || order.phone || '',
      itemsText,
      totalQty,
      order.subtotal || order.total || 0,
      order.discount || 0,
      order.total || 0,
      order.cashGiven || 0,
      order.change || 0,
      order.status || 'pending',
      order.dispatchMode || 'group',
      order.notes || '',
      mapLink,
      photoDisplay
    ]);

    return {
      status: 'success',
      message: 'Order saved successfully to Google Sheet',
      orderId: order.id
    };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 🔄 Function ອັບເດດສະຖານະອໍເດີໃນ Sheet "Orders"
 */
function updateOrderStatusFromClient(orderId, newStatus) {
  const lock = LockService.getScriptLock();
  lock.tryLock(15000);

  try {
    const ss = getTargetSpreadsheet();
    const sheet = ss.getSheetByName('Orders');
    if (!sheet) return { status: 'error', message: 'Sheet Orders not found' };

    const data = sheet.getDataRange().getValues();
    let updated = false;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(orderId).trim()) {
        sheet.getRange(i + 1, 12).setValue(newStatus);
        updated = true;
        break;
      }
    }

    return { status: 'success', message: 'Status updated', updated: updated };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 📖 Function ອ່ານລາຍການເມນູຈາກ Sheet "Menu"
 */
function getMenuFromSheet() {
  try {
    const ss = getTargetSpreadsheet();
    const sheet = ss.getSheetByName('Menu') || ss.getSheetByName('ເມນູ') || ss.getSheets()[0];
    if (!sheet) return { status: 'error', message: 'Sheet Menu not found' };

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { status: 'success', products: [] };

    const products = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0] && !row[1]) continue;
      
      let img = '';
      let driveViewUrl = '';
      let fileId = '';

      // 1. ອ່ານຖັນທີ 10 (Column J - Image URL)
      if (row.length > 9) {
        const val9 = String(row[9] || '').trim();
        if ((val9.startsWith('http://') || val9.startsWith('https://')) && !val9.startsWith('=')) {
          img = val9;
        }
      }

      // 2. ອ່ານຖັນທີ 11 (Column K - Drive View URL)
      if (row.length > 10) {
        const val10 = String(row[10] || '').trim();
        if (val10.startsWith('http://') || val10.startsWith('https://')) {
          driveViewUrl = val10;
        }
      }

      // 3. Fallback: ຄົ້ນຫາຖັນອື່ນໆ ຖ້າບໍ່ພົບໃນຖັນ 10
      if (!img) {
        for (let c = 5; c < row.length; c++) {
          const val = String(row[c] || '').trim();
          if ((val.startsWith('http://') || val.startsWith('https://')) && !val.startsWith('=')) {
            img = val;
            break;
          }
        }
      }

      // 4. ແປງລິ້ງ Drive ທຸກຮູບແບບເປັນ Direct CDN Image URL (https://lh3.googleusercontent.com/d/FILE_ID)
      if (img.includes('drive.google.com/file/d/')) {
        const match = img.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match) {
          fileId = match[1];
          img = 'https://lh3.googleusercontent.com/d/' + fileId;
        }
      } else if (img.includes('googleusercontent.com/d/')) {
        const match = img.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match) fileId = match[1];
      } else if (img.includes('id=')) {
        const match = img.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (match) {
          fileId = match[1];
          img = 'https://lh3.googleusercontent.com/d/' + fileId;
        }
      }

      if (!driveViewUrl && fileId) {
        driveViewUrl = 'https://drive.google.com/file/d/' + fileId + '/view';
      }

      products.push({
        id: String(row[0] || ('item-' + i)),
        name: String(row[1] || ''),
        nameEn: String(row[2] || ''),
        sub: String(row[3] || ''),
        category: String(row[4] || 'drinks'),
        price: Number(row[5]) || 0,
        badgeText: String(row[6] || ''),
        badgeType: String(row[7] || ''),
        image: img,
        driveFileId: fileId,
        driveViewUrl: driveViewUrl
      });
    }

    // 5. ອັດຕະໂນມັດ: ຖ້າມີສິນຄ້າທີ່ຍັງບໍ່ມີຮູບ (image === '') ໃຫ້ກວດສອບ ແລະ ດຶງຮູບຈາກ Google Drive "order app" ມາໃສ່ທັນທີ
    const hasMissingImages = products.some(function(p) { return !p.image; });
    if (hasMissingImages) {
      try {
        const folder = getTargetDriveFolder();
        if (folder) {
          const files = folder.getFiles();
          const drivePhotos = [];
          while (files.hasNext()) {
            const f = files.next();
            const mime = (f.getMimeType() || '').toLowerCase();
            if (mime.indexOf('image/') === 0 || f.getName().match(/\.(jpe?g|png|webp|gif)$/i)) {
              try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
              const fid = f.getId();
              drivePhotos.push({
                fileId: fid,
                name: f.getName(),
                thumbnailUrl: 'https://drive.google.com/thumbnail?id=' + fid + '&sz=w800',
                viewUrl: f.getUrl(),
                time: f.getLastUpdated().getTime()
              });
            }
          }

          if (drivePhotos.length > 0) {
            drivePhotos.sort(function(a, b) { return b.time - a.time; });
            for (let i = 0; i < products.length; i++) {
              const p = products[i];
              if (!p.image) {
                const pNameClean = (p.name || '').replace(/[\s\-_]/g, '').toLowerCase();
                let match = null;
                for (let k = 0; k < drivePhotos.length; k++) {
                  const dp = drivePhotos[k];
                  const dpNameClean = dp.name.replace(/[\s\-_]/g, '').toLowerCase();
                  if (dpNameClean.indexOf(pNameClean) !== -1 || pNameClean.indexOf(dpNameClean.replace(/\.[a-z0-9]+$/, '')) !== -1 || dp.name.indexOf(p.id) !== -1) {
                    match = dp;
                    break;
                  }
                }
                if (match) {
                  p.image = match.thumbnailUrl;
                  p.driveFileId = match.fileId;
                  p.driveViewUrl = match.viewUrl;
                  try {
                    sheet.getRange(i + 2, 10).setValue(match.thumbnailUrl);
                    sheet.getRange(i + 2, 11).setValue(match.viewUrl);
                  } catch (e) {}
                }
              }
            }
          }
        }
      } catch (autoErr) {
        Logger.log('Drive auto-resolution warning: ' + autoErr);
      }
    }

    return { status: 'success', products: products };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

/**
 * 🔄 Function ດຶງຮູບຈາກ Google Drive ໂຟນເດີ "order app" ມາຈັບຄູ່ກັບເມນູສິນຄ້າໃນ Sheet ອັດຕະໂນມັດ
 */
function syncDriveImagesToSheet() {
  const lock = LockService.getScriptLock();
  lock.tryLock(30000);
  try {
    const folder = getTargetDriveFolder();
    if (!folder) {
      return { status: 'error', message: 'ບໍ່ພົບໂຟນເດີ Drive ID: ' + DRIVE_FOLDER_ID };
    }

    try {
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {}

    const files = folder.getFiles();
    const drivePhotos = [];
    while (files.hasNext()) {
      const f = files.next();
      const mime = (f.getMimeType() || '').toLowerCase();
      if (mime.indexOf('image/') === 0 || f.getName().match(/\.(jpe?g|png|webp|gif)$/i)) {
        try {
          f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (e) {}
        const fid = f.getId();
        drivePhotos.push({
          id: fid,
          fileId: fid,
          name: f.getName(),
          thumbnailUrl: 'https://drive.google.com/thumbnail?id=' + fid + '&sz=w800',
          directUrl: 'https://lh3.googleusercontent.com/d/' + fid,
          viewUrl: f.getUrl(),
          updated: f.getLastUpdated().getTime()
        });
      }
    }

    drivePhotos.sort(function(a, b) { return b.updated - a.updated; });

    const ss = getTargetSpreadsheet();
    let sheet = ss.getSheetByName('Menu');
    if (!sheet) {
      sheet = setupMenuTable(ss);
    }

    const data = sheet.getDataRange().getValues();
    let updatedCount = 0;
    const matchedProducts = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const prodId = String(row[0] || '').trim();
      const prodName = String(row[1] || '').trim();

      if (!prodName && !prodId) continue;

      let matchedFile = null;
      const pNameClean = prodName.replace(/[\s\-_]/g, '').toLowerCase();

      for (let j = 0; j < drivePhotos.length; j++) {
        const photo = drivePhotos[j];
        const fNameClean = photo.name.replace(/[\s\-_]/g, '').toLowerCase();

        if (fNameClean.indexOf(pNameClean) !== -1 || pNameClean.indexOf(fNameClean.replace(/\.[a-z0-9]+$/, '')) !== -1 ||
            (prodId && photo.name.indexOf(prodId) !== -1)) {
          matchedFile = photo;
          break;
        }
      }

      if (matchedFile) {
        const bestUrl = 'https://drive.google.com/thumbnail?id=' + matchedFile.id + '&sz=w800';
        sheet.getRange(i + 1, 10).setValue(bestUrl);
        sheet.getRange(i + 1, 11).setValue(matchedFile.viewUrl);
        updatedCount++;
        matchedProducts.push({
          id: prodId,
          name: prodName,
          matchedFile: matchedFile.name,
          image: bestUrl,
          driveViewUrl: matchedFile.viewUrl
        });
      }
    }

    return {
      status: 'success',
      message: 'ດຶງຮູບພາບຈາກ Google Drive ' + drivePhotos.length + ' ຮູບ ແລະ ອັບເດດໃຫ້ເມນູ ' + updatedCount + ' ລາຍການສຳເລັດແລ້ວ!',
      totalDrivePhotos: drivePhotos.length,
      syncedCount: updatedCount,
      matchedProducts: matchedProducts,
      drivePhotos: drivePhotos
    };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 📁 Function ລາຍການໄຟລ໌ຮູບທັງໝົດໃນ Google Drive ໂຟນເດີ "order app"
 */
function listDriveImages() {
  try {
    const folder = getTargetDriveFolder();
    if (!folder) return { status: 'error', message: 'Drive folder not found', files: [] };

    try {
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {}

    const files = folder.getFiles();
    const list = [];
    while (files.hasNext()) {
      const f = files.next();
      const mime = (f.getMimeType() || '').toLowerCase();
      if (mime.indexOf('image/') === 0 || f.getName().match(/\.(jpe?g|png|webp|gif)$/i)) {
        try {
          f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (e) {}
        const fid = f.getId();
        list.push({
          fileId: fid,
          id: fid,
          name: f.getName(),
          size: f.getSize(),
          thumbnailUrl: 'https://drive.google.com/thumbnail?id=' + fid + '&sz=w800',
          directUrl: 'https://lh3.googleusercontent.com/d/' + fid,
          viewUrl: f.getUrl(),
          dateCreated: f.getDateCreated().toISOString()
        });
      }
    }

    list.sort(function(a, b) { return new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime(); });
    return {
      status: 'success',
      folderId: DRIVE_FOLDER_ID,
      folderName: folder.getName(),
      count: list.length,
      files: list
    };
  } catch (err) {
    return { status: 'error', message: err.toString(), files: [] };
  }
}

/**
 * 🎯 Function ກຳນົດຮູບຈາກ Google Drive ໃຫ້ເມນູສິນຄ້າ 1 ລາຍການໂດຍກົງ
 */
function assignDriveImageToProduct(productId, fileId) {
  if (!productId || !fileId) {
    return { status: 'error', message: 'Missing productId or fileId' };
  }
  const lock = LockService.getScriptLock();
  lock.tryLock(15000);
  try {
    const ss = getTargetSpreadsheet();
    const sheet = ss.getSheetByName('Menu');
    if (!sheet) return { status: 'error', message: 'Sheet Menu not found' };

    try {
      const file = DriveApp.getFileById(fileId);
      if (file) {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      }
    } catch (e) {}

    const data = sheet.getDataRange().getValues();
    let targetRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(productId).trim()) {
        targetRow = i + 1;
        break;
      }
    }

    if (targetRow === -1) {
      return { status: 'error', message: 'Product ID not found: ' + productId };
    }

    const imgUrl = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w800';
    const viewUrl = 'https://drive.google.com/file/d/' + fileId + '/view';

    sheet.getRange(targetRow, 10).setValue(imgUrl);
    sheet.getRange(targetRow, 11).setValue(viewUrl);

    return {
      status: 'success',
      productId: productId,
      fileId: fileId,
      image: imgUrl,
      driveViewUrl: viewUrl
    };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 👥 Function ອ່ານລາຍຊື່ພະນັກງານຈາກ Sheet "Cashiers"
 */
function getCashiersFromSheet() {
  try {
    const ss = getTargetSpreadsheet();
    const sheet = ss.getSheetByName('Cashiers') || ss.getSheetByName('ພະນັກງານ');
    if (!sheet) return { status: 'error', message: 'Sheet Cashiers not found' };

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return { status: 'success', cashiers: [] };

    const cashiers = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0] && !row[1]) continue;
      
      let photoUrl = '';
      let driveViewUrl = '';
      let fileId = '';

      // 1. ອ່ານຖັນທີ 5 (Column E - Photo URL)
      if (row.length > 4) {
        const val4 = String(row[4] || '').trim();
        if ((val4.startsWith('http://') || val4.startsWith('https://')) && !val4.startsWith('=')) {
          photoUrl = val4;
        }
      }

      // 2. ອ່ານຖັນທີ 6 (Column F - Drive View URL)
      if (row.length > 5) {
        const val5 = String(row[5] || '').trim();
        if (val5.startsWith('http://') || val5.startsWith('https://')) {
          driveViewUrl = val5;
        }
      }

      if (!photoUrl) {
        for (let c = 2; c < row.length; c++) {
          const val = String(row[c] || '').trim();
          if ((val.startsWith('http://') || val.startsWith('https://')) && !val.startsWith('=')) {
            photoUrl = val;
            break;
          }
        }
      }

      if (photoUrl.includes('drive.google.com/file/d/')) {
        const match = photoUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match) {
          fileId = match[1];
          photoUrl = 'https://lh3.googleusercontent.com/d/' + fileId;
        }
      } else if (photoUrl.includes('googleusercontent.com/d/')) {
        const match = photoUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match) fileId = match[1];
      }

      if (!driveViewUrl && fileId) {
        driveViewUrl = 'https://drive.google.com/file/d/' + fileId + '/view';
      }

      cashiers.push({
        id: String(row[0] || ('cashier_' + i)),
        name: String(row[1] || ''),
        color: String(row[2] || '#006c49'),
        photo: photoUrl,
        driveFileId: fileId,
        driveViewUrl: driveViewUrl
      });
    }

    return { status: 'success', cashiers: cashiers };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
