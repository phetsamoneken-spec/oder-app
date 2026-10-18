const SPREADSHEET_ID = '1khGFmVfEqPhTyuDyd_zc8chNEhldTch3bzKAIrq-spA';

// ເມື່ອເປີດ Web App URL ຜ່ານ Browser ຈະດຶງໜ້າ index.html ມາສະແດງຜົນ
function doGet(e) {
  // ຖ້າເປັນການ Request ທົດສອບ connection ຈະຕອບກັບ JSON
  if (e && e.parameter && e.parameter.action === 'ping') {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      timestamp: new Date().toISOString(),
      message: 'Google Sheet Connected successfully!',
      sheetId: SPREADSHEET_ID
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // ດຶງໜ້າ index.html ຂຶ້ນມາສະແດງໃນ Web App
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Beerlao POS - ລະບົບຂາຍໜ້າຮ້ານ')
    .setFaviconUrl('https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Beerlao_logo.svg/320px-Beerlao_logo.svg.png')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ຮັບຂໍ້ມູນ POST ຈາກ Web App ເພື່ອບັນທຶກ ຫຼື ອັບເດດສະຖານະ
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const rawData = e.postData ? e.postData.contents : null;
    if (!rawData) {
      return jsonResponse({ status: 'error', message: 'No payload received' });
    }

    const payload = JSON.parse(rawData);

    // ກໍລະນີອັບເດດສະຖານະອໍເດີ (Update Status)
    if (payload.action === 'update_status' || payload.action === 'updateStatus') {
      const statusText = payload.collector ? `${payload.status} (${payload.collector})` : payload.status;
      const res = updateOrderStatusFromClient(payload.orderId, statusText);
      return jsonResponse(res);
    }

    // ກໍລະນີບັນທຶກອໍເດີໃໝ່ (Insert Order)
    const order = payload.order || payload;
    const res = saveOrderFromClient(order);
    return jsonResponse(res);

  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

// Function ບັນທຶກອໍເດີໂດຍກົງເມື່ອ Run ຜ່ານ Apps Script Web App
function saveOrderFromClient(order) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('Orders');

    // ຖ້າບໍ່ທັນມີ Sheet Orders ໃຫ້ສ້າງໃໝ່ພ້ອມຫົວຕາຕະລາງ
    if (!sheet) {
      sheet = ss.insertSheet('Orders');
      sheet.appendRow([
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
        'ຮູບໜ້າຮ້ານ'
      ]);
      sheet.getRange(1, 1, 1, 16).setBackground('#006c49').setFontColor('#ffffff').setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    const itemsText = (order.items || []).map(it => `${it.productName || it.name} (${it.quantity})`).join(', ');
    const totalQty = (order.items || []).reduce((sum, it) => sum + (it.quantity || 1), 0);
    const mapLink = (order.location && order.location.lat) 
      ? `https://www.google.com/maps?q=${order.location.lat},${order.location.lng}` 
      : '';
    const photoStatus = order.storePhoto ? 'ແນບສົ່ງເຂົ້າ WhatsApp ແລ້ວ' : 'ບໍ່ມີຮູບ';

    sheet.appendRow([
      order.id,
      order.createdAt || new Date().toISOString(),
      order.customerName || 'ລູກຄ້າທົ່ວໄປ',
      order.customerPhone || order.phone || '',
      itemsText,
      totalQty,
      order.subtotal || order.total,
      order.discount || 0,
      order.total,
      order.cashGiven || 0,
      order.change || 0,
      order.status || 'pending',
      order.dispatchMode || 'group',
      order.notes || '',
      mapLink,
      photoStatus
    ]);

    return {
      status: 'success',
      message: 'Order saved successfully',
      orderId: order.id
    };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

// Function ອັບເດດສະຖານະອໍເດີ
function updateOrderStatusFromClient(orderId, newStatus) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('Orders');
    if (!sheet) return { status: 'error', message: 'Sheet Orders not found' };

    const data = sheet.getDataRange().getValues();
    let updated = false;

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === orderId) {
        sheet.getRange(i + 1, 12).setValue(newStatus); // ຖັນທີ 12 ຄື ສະຖານະ
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

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
