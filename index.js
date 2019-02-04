
var chunkSize = 1024*1024; // bytes
var timeout = 10; // millisec

var globalpct = 0;
var globalhash;

var fileobj = {};
var jsonobj = fileobj;

var certificatefileobj;

var blockchainobj;

var done_hashing = false;
var done_blockchainlookup = false;

var inputElement = document.getElementById("document");
inputElement.addEventListener("change", handleFiles, false);

var inputElement2 = document.getElementById("documentvalidate");
inputElement2.addEventListener("change", handleFiles2, false);


var qrcode;

var lastcheckedblock = 0;

var blockchaininterval;

var blockchainmonitoring = false;

var blockdata;

$("#document").click(function(event){
    clear();
})

function updateProgress(globalpct) {

    //console.log('updateprogress');
    //console.log(globalpct);
    $('#progressbar').attr('aria-valuenow',globalpct);
    $('#progressbar').css("width",globalpct+"%");
    $('#progressbar').text(globalpct+"%");

}

function compareResults() {
  if(done_hashing && done_blockchainlookup) {
    //console.log("blockchainobj",blockchainobj);
    //console.log("hash", fileobj);

    var memoobj = JSON.parse(blockchainobj['tx']['operations'][0][1]['memo']);
    $('#info2').html('');
    //$("#timeStart").val(new Date(timeStart));
    //$("#timeEnd").val(new Date(timeEnd));
    fileobj['created'] = 'now';
    $('<code/><br />').text('File fingerprint result:').appendTo('#info2');
    $('<pre/>').css('overflow-x','hidden').text(JSON.stringify(fileobj, undefined, 4)).appendTo('#info2');
    $('<code/><br />').text('').appendTo('#info2');
    $('<code/><br />').text('Blockchain lookup result:').appendTo('#info2');
    $('<pre/>').css('overflow-x','hidden').text(JSON.stringify(JSON.parse(blockchainobj['tx']['operations'][0][1]['memo']), undefined, 4)).appendTo('#info2');
    $('<code/><br />').text('').appendTo('#info2');
    // $('<code/><br />').text('Raw transaction data:').appendTo('#info2');
    // $('<pre/>').css('overflow-x','hidden').text(JSON.stringify((blockchainobj['tx']), undefined, 4)).appendTo('#info2');

    if(memoobj['hash'] == fileobj['hash']) {
        //console.log('ALL GOOD, ALL THE SAME!');
        var html = `
          <h2>Fingerprint match!</h2><h2 class="mb-4 mt-4"><code>${fileobj['hash']}</code></h2>
          <p><b>With 100% certainty we can guarantee that the fingerprint of the file <code>${fileobj['filename']}</code>, matches the one stored on <code >${blockchainobj['block']['result']['timestamp']}</code> in block <code>${blockchainobj['tx']['block_num']}</code> on the Steem blockchain.</b></p>
          <p>Follow the links below to see the transaction in various block explorers:</p>
          <p>
          <a class="btn btn-primary mr-2 tt" href="https://steemd.com/b/${blockchainobj['tx']['block_num']}\#${blockchainobj['tx']['transaction_id']}" target="_blank">SteemD</a>
          <a class="btn btn-primary mr-2 tt" href="https://steemdb.com/block/${blockchainobj['tx']['block_num']}" target="_blank">SteemDB</a>
          <a class="btn btn-primary mr-2 tt" href="https://steemblockexplorer.com/block/${blockchainobj['tx']['block_num']}" target="_blank">Steem Block Explorer</a>
          </p>
        `;
        $('#postonchainform2').html(html);
    } else {


    }
    $('#filehashform2').slideUp(function() {
      $('#postonchainform2').slideDown();
    });
  } else {
    return;
  }
}

function handleFiles2() {
  // validator;

    done_hashing = false;
    done_blockchainlookup = false;
    var file = this.files[0];
    if(file===undefined){
        return;
    }

    if (parseInt(this.files.length)!=2){
      alert('We need 2 files in 1 go:\n\n1. The original file\n2. The proof.ink.*.txt file');
      return;
    }
    var hascertificatefile = false;

    for(var i = 0; i < this.files.length; i++) {
        var tempf = this.files[i];
        //console.log(tempf.name);
        if(/^proof\.ink\.([0-9]+)\.txt$/.test(tempf.name)) {
          ////console.log('hit on regex');
          hascertificatefile = true;
          var reader = new FileReader();
         reader.onload = function(event) {
           // The file's text will be printed here
           ////console.log(reader.result);
           certificatefileobj = JSON.parse(reader.result);
           if(!certificatefileobj) {
             alert('Couldn\'t parse certificatefile. Does not seem valid JSON');
             return;
           }

           jsonobj = certificatefileobj['file'];
           getBlock(certificatefileobj['blockchain']['block_num'], compareResults);

         };

         reader.readAsText(file);

        } else {
          file = this.files[i];
        }
    }

    if(!hascertificatefile) {
      alert('We did not find the proof.ink certificate file. Looking for a file name like this:\n\nproof.ink.*.txt\n\n(Where * is a number)');
      return;
    }


    var SHA256 = CryptoJS.algo.SHA256.create();
    var counter = 0;
    var self = this;

    var timeStart = new Date().getTime();
    var timeEnd = 0;
    $('#info2').html('');
    $('<code/><br />').text(new Date(timeStart).toUTCString()).appendTo('#info2');
    $('<code/><br />').text("Filename: "+file.name).appendTo('#info2');
    $('<code/><br />').text("Filesize: "+humanFileSize(file.size,true)).appendTo('#info2');
    $('<code/><br />').text('Status: now fingerprinting. This can take a while...').appendTo('#info2');
    $('<code/><br />').html('<span class="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>').appendTo('#info2');

    fileobj = {
      filename: file.name,
      filesize: file.size,
      created: timeStart,
    }

    //chunkSize = parseInt($("#chunkSize").val());


    loading(file,
        function (data) {

            var pct = (( counter / file.size)*100).toFixed(0);
            updateProgress(pct);

            var wordBuffer = CryptoJS.lib.WordArray.create(data);
            SHA256.update(wordBuffer);
            counter += data.byteLength;




        }, function (data) {
            $('<code/><br />').text('Done').appendTo('#info2');
            var encrypted = SHA256.finalize().toString();
            globalhash = encrypted;

            $("#hash").val(encrypted);
            timeEnd = new Date().getTime();
            $('#info2').html('');
            //$("#timeStart").val(new Date(timeStart));
            //$("#timeEnd").val(new Date(timeEnd));
            $('<code/><br />').text('Done hashing!').appendTo('#info2');
            $('<code/><br />').text('Duration: '+((timeEnd-timeStart)/1000)+' sec').appendTo('#info2');
            $('#filehashform').slideUp(function() {
              $('#postonchainform').slideDown();
            });

            fileobj['hash'] = encrypted;
            fileobj['chunks'] = chunkTotal;

            $('<pre/>').css('overflow-x','hidden').text(JSON.stringify(fileobj, undefined, 4)).appendTo('#info2');

            done_hashing = true;
            compareResults();

        });

};

function handleFiles() {
    var file = this.files[0];
    if(file===undefined){
        return;
    }
    var SHA256 = CryptoJS.algo.SHA256.create();
    var counter = 0;
    var self = this;

    var timeStart = new Date().getTime();
    var timeEnd = 0;
    $('#info').html('');
    $('<code/><br />').text(new Date(timeStart).toUTCString()).appendTo('#info');
    $('<code/><br />').text("Filename: "+file.name).appendTo('#info');
    $('<code/><br />').text("Filesize: "+humanFileSize(file.size,true)).appendTo('#info');
    $('<code/><br />').text('Status: now fingerprinting. This can take a while...').appendTo('#info');
    $('<code/><br />').html('<span class="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>').appendTo('#info');

    fileobj = {
      filename: file.name,
      filesize: file.size,
      created: timeStart,
    }

    //chunkSize = parseInt($("#chunkSize").val());


    loading(file,
        function (data) {

            var pct = (( counter / file.size)*100).toFixed(0);
            updateProgress(pct);

            var wordBuffer = CryptoJS.lib.WordArray.create(data);
            SHA256.update(wordBuffer);
            counter += data.byteLength;




        }, function (data) {
            $('<code/><br />').text('Done').appendTo('#info');
            var encrypted = SHA256.finalize().toString();
            globalhash = encrypted;

            $("#hash").val(encrypted);
            timeEnd = new Date().getTime();
            $('#info').html('');
            //$("#timeStart").val(new Date(timeStart));
            //$("#timeEnd").val(new Date(timeEnd));
            $('<code/><br />').text('Done hashing!');
            $('<code/><br />').text('Duration: '+((timeEnd-timeStart)/1000)+' sec').appendTo('#info');
            $('#filehashform').slideUp(function() {
              $('#postonchainform').slideDown();
            });

            fileobj['hash'] = encrypted;
            fileobj['chunks'] = chunkTotal;

            $('<pre/>').css('overflow-x','hidden').text(JSON.stringify(fileobj, undefined, 4)).appendTo('#info');
            $('#prev_filename').text(fileobj['filename']);
            $('#prev_chunks').text(fileobj['chunks']);
            $('#prev_fingerprint').text(fileobj['hash']);
            $('#prev_filesize').text(fileobj['filesize']);
            $('#prev_created').text(fileobj['created']);

            calcPreview();
        });

};

function calcPreview() {
  $('#previewjson').html('');
  jsonobj = {hash: fileobj['hash']};

  var toadd = [];

  $('.topost').each(function(i,v){
    if($(v).prop('checked')) {
      jsonobj[$(v).prop('id').split('_')[1]] = fileobj[$(v).prop('id').split('_')[1]];
    }
  });

  $('<pre/>').css('overflow-x','hidden').text(JSON.stringify(jsonobj, undefined, 4)).appendTo('#previewjson');

  $('#manualmodaltextarea').text(JSON.stringify(jsonobj));

  prepUrls();
}

function b64u_enc(data) {
  b64u_lookup = {'/': '_', '_': '/', '+': '-', '-': '+', '=': '.', '.': '='}
  //console.log(window.btoa(data));
  return window.btoa(data).replace(/(\+|\/|=)/g, function(stri){ return b64u_lookup[stri];});
}

function steemkeychain() {

  var amount = parseFloat($('#amount').val());
  if(!amount || amount == 0) {
    alert('Please adjust the amount of steem/sbd');
  }
  var currency = $('#currency').val();

  steem_keychain.requestTransfer('__signer', 'proof.ink', amount, JSON.stringify(jsonobj), currency, function(response) {

  });
}

function saveProof(){

  var tosave = {
    "_readme": "This file can be used to verify the integrity of the accompanying file by using the Proof.ink website",
    "file": fileobj,
    "blockchain": blockdata,
  };

  var filecontents = JSON.stringify(tosave, undefined, 4);

  try {
    var isFileSaverSupported = !!new Blob;

    var blob = new Blob([filecontents], {type: "text/plain;charset=utf-8"});
    saveAs(blob, "proof.ink."+fileobj['created']+".txt");

  } catch (e) {
    ////console.log(e);
    alert('Your browser does not support the file download protocol. Please copy paste the full contents of the displayed data into a raw text-file and save it');
  }

}

function foundProof(tx) {
  $('.tt').tooltip('dispose')
  $('#previewjson').html('<img src="img/undraw_confirmation.svg" class="img-fluid" />');
  //$('<pre/>').css('overflow-x','hidden').text(JSON.stringify(tx, undefined, 4)).appendTo('#previewjson');
  blockdata = tx;
  $('#postbuts').html('');
  $('#formpostinputs').html('');
  $('#whattostore').html('<p>Your proof was recorded on the Steem blockchain in <b>block #'+tx['block_num']+'</b>.</p><p>Please <a href="#saveproof" onclick="saveProof()">save the proof.txt</a> file alongside the original file.<br/><br/>Use it whenever you need to proof the integrity, simply by visiting proof.ink again.</p><p><a class="btn btn-warning btn-lg mr-2" title="Save Proof" onclick="saveProof()" href="#saveproof"><b>save</b> proof.ink.txt</a></p>');
  $('#whattostore').removeClass('card');
  $('#storefp_h2').text('Great success!');
  $('#storefp_p').html('Your fingerprint is now immutably stored.');

}

function getBlock(num, cb) {
  $.ajax({url: "https://api.steemit.com",
    data: '{"jsonrpc":"2.0", "method":"condenser_api.get_block", "params":['+num+'], "id":1}',
    dataType: 'json',
    type: 'POST',
    success: function(result){
      //witness = (result.result.current_witness);
      ////console.log(result.result.head_block_number);
      ////console.log('result for getBlock num '+num);
      lastcheckedblock = num;
      var block = result;
      ////console.log(result.result.transactions.length);
      var tx = result.result.transactions;
      for(var i = 0; i < tx.length; i++) {

        if(tx[i]['operations'][0][0] == 'transfer') {
          var transfer = tx[i]['operations'][0][1];
          ////console.log(i, transfer['from'], transfer['to'],transfer['memo']);
          if(transfer['to'] == 'proof.ink') {
            // check if this is our tx.
            var memoparse = JSON.parse(transfer['memo']);
            if(memoparse){
              if(memoparse.hasOwnProperty('hash')) {
                if(memoparse['hash'] == jsonobj['hash']) {
                  //got our signed proof.ink
                  ////console.log('FOUND THE HASH');
                  clearInterval(blockchaininterval);
                  if(cb){
                    done_blockchainlookup = true;
                    blockchainobj = {block: block, tx: tx[i]};
                    cb();
                  } else {
                    foundProof(tx[i]);
                  }


                }
              }
            }
          }
        }

      }
      // if(result.result.head_block_number > lastcheckedblock) {
      //     // need to fetch block from steemit.
      //
      //     getBlock(result.result.head_block_number);
      // }


    }
    });
}
function getChain() {
  $.ajax({url: "https://api.steemit.com",
    data: '{"jsonrpc":"2.0", "method":"condenser_api.get_dynamic_global_properties", "params":[], "id":1}',
    dataType: 'json',
    type: 'POST',
    success: function(result){
      //witness = (result.result.current_witness);
      ////console.log(result.result.head_block_number);
      if(result.result.head_block_number > lastcheckedblock) {
          // need to fetch block from steemit.

          getBlock(result.result.head_block_number);
      }


    }
    });
}



function prepUrls() {
  var uris = [];

  var amount = parseFloat($('#amount').val());
  if(!amount || amount == 0) {
    alert('Please adjust the amount of steem/sbd');
  }
  var currency = $('#currency').val();

  uris['steemuri'] = "steem://sign/transfer/proof.ink/"+encodeURIComponent(amount+' '+currency)+"/"+b64u_enc(JSON.stringify(jsonobj));
  uris['steemconnect'] = 'https://steemconnect.com/sign/transfer?to=proof.ink&amount='+encodeURIComponent(amount+' '+currency)+'&memo='+encodeURIComponent(JSON.stringify(jsonobj));
  qrcode.clear();
  qrcode.makeCode(uris['steemuri']);

  var steem_keychain = '';
  if(window.steem_keychain) {
    // Steem Keychain extension installed...
    steem_keychain = '<button type="button" class="btn btn-primary mr-2 tt" onclick="steemkeychain()" data-toggle="tooltip" title="A browser based plugin for storing Steem keys and signing transactions">Steem Keychain</button>';
  }

  $('#postbuts').html('<a class="btn btn-primary mr-2 tt" href="'+uris['steemconnect']+'" target="_blank" data-toggle="tooltip" title="A third party tool handling the signing &amp; broadcasting of Steem transactions">SteemConnect</a> <a class="btn btn-primary mr-2 tt" href="'+uris['steemuri']+'" data-toggle="tooltip" title="Sign with steem:// supported app such as Vessel or SteemWallet" target="_blank">Steem://</a> <button type="button" class="btn btn-primary mr-2 tt" data-toggle="modal" data-target="#qrmodal" title="Scan QR code with your phone to launch steem:// supported app">QR Code</button> '+ steem_keychain + ' <button type="button" class="btn btn-primary mr-2 tt" data-toggle="modal" data-target="#manualmodal" title="Open instructions for manual transfer">Manual</button>');
  ////console.log(uris);
  $('.tt').tooltip();
  if(!blockchainmonitoring) {
    blockchainmonitoring = true;
    blockchaininterval = setInterval(getChain,1000);
  }
}

function clear(){
    $("#timeStart").val('');
    $("#timeEnd").val('');
    $("#timeDelta").val('');
    $("#hash").val('');
    $("#fileSize").val('');
    $("#chunkTotal").val('');
    $("#chunkReorder").val('');

    lastOffset = 0;
    chunkReorder = 0;
    chunkTotal = 0;
}


function loading(file, callbackProgress, callbackFinal) {
    //var chunkSize  = 1024*1024; // bytes
    var offset     = 0;
    var size=chunkSize;
    var partial;
    var index = 0;

    if(file.size===0){
        callbackFinal();
    }
    while (offset < file.size) {
        partial = file.slice(offset, offset+size);
        var reader = new FileReader;
        reader.size = chunkSize;
        reader.offset = offset;
        reader.index = index;
        reader.onload = function(evt) {
            callbackRead(this, file, evt, callbackProgress, callbackFinal);
        };
        reader.readAsArrayBuffer(partial);
        offset += chunkSize;
        index += 1;
    }
}

function callbackRead(obj, file, evt, callbackProgress, callbackFinal){
    //if( $("#switchMode").is(':checked') ){
    callbackRead_buffered(obj, file, evt, callbackProgress, callbackFinal);
    // } else {
    //     callbackRead_waiting(obj, file, evt, callbackProgress, callbackFinal);
    // }
}

var lastOffset = 0;
var chunkReorder = 0;
var chunkTotal = 0;
// time reordering
function callbackRead_waiting(reader, file, evt, callbackProgress, callbackFinal){
    if(lastOffset === reader.offset) {
        //console.log("[",reader.size,"]",reader.offset,'->', reader.offset+reader.size,"");
        lastOffset = reader.offset+reader.size;
        callbackProgress(evt.target.result);
        if ( reader.offset + reader.size >= file.size ){
            lastOffset = 0;
            callbackFinal();
        }
        chunkTotal++;
    } else {
        //console.log("[",reader.size,"]",reader.offset,'->', reader.offset+reader.size,"wait");
        setTimeout(function () {
            callbackRead_waiting(reader,file,evt, callbackProgress, callbackFinal);
        }, timeout);
        chunkReorder++;
    }
}
// memory reordering
var previous = [];
function callbackRead_buffered(reader, file, evt, callbackProgress, callbackFinal){
    chunkTotal++;

    if(lastOffset !== reader.offset){
        // out of order
        ////console.log("[",reader.size,"]",reader.offset,'->', reader.offset+reader.size,">>buffer");
        previous.push({ offset: reader.offset, size: reader.size, result: reader.result});
        chunkReorder++;
        return;
    }

    function parseResult(offset, size, result) {
        lastOffset = offset + size;
        callbackProgress(result);
        if (offset + size >= file.size) {
            lastOffset = 0;
            callbackFinal();
        }
    }

    // in order
    ////console.log("[",reader.size,"]",reader.offset,'->', reader.offset+reader.size,"");
    parseResult(reader.offset, reader.size, reader.result);

    // resolve previous buffered
    var buffered = [{}]
    while (buffered.length > 0) {
        buffered = previous.filter(function (item) {
            return item.offset === lastOffset;
        });
        buffered.forEach(function (item) {
            //console.log("[", item.size, "]", item.offset, '->', item.offset + item.size, "<<buffer");
            parseResult(item.offset, item.size, item.result);
            previous.remove(item);
        })
    }

}

Array.prototype.remove = Array.prototype.remove || function(val){
    var i = this.length;
    while(i--){
        if (this[i] === val){
            this.splice(i,1);
        }
    }
};

// Human file size
function humanFileSize(bytes, si) {
    var thresh = si ? 1000 : 1024;
    if (Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }
    var units = si
        ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
        : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    var u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while (Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1) + ' ' + units[u];
}

$(document).ready(function(){
  $('.home').on("click", function(){
    $('.carousel').carousel(0).carousel('pause');
  });
  $('.proofit').on("click", function(){
    $('.carousel').carousel(1).carousel('pause');
  });
  $('.verifyit').on("click", function(){
    $('.carousel').carousel(4).carousel('pause');
  });
  $('.about').on("click", function(){
    $('.carousel').carousel(3).carousel('pause');
  });
  $('.postit').on("click", function(){
    $('.carousel').carousel(2).carousel('pause');
  });

  $('.faq').on("click", function(){
    $('.carousel').carousel(5).carousel('pause');
  });

  $('.topost').on('change',function(e) {
    calcPreview();
  });

  qrcode = new QRCode(document.getElementById("qrcode"), {
    width: 466,
    height: 466,
    colorDark : "#212529",
    colorLight : "#ffffff",
  });
});
