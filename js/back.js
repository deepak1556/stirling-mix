var audio, source, dsp, analyser, canvas, ctx, peaked = false,
    clips = 0,
    fdata;

function clog(str) {
    if (window.console && console.log) console.log(str);
}

function noop(e) {
    e.stopPropagation();
    e.preventDefault();
}

function drop(e) {
    e.stopPropagation();
    e.preventDefault();
    
    $('#loading').show();
    $('#loading').text("loading...");
    if (source != null) source.disconnect(0);

    source = audio.createBufferSource();
    dsp = audio.createScriptProcessor(4096, 1, 1);
    dsp.onaudioprocess = draw;
    analyser = audio.createAnalyser();
    var reader = new FileReader();

    reader.onload = function(e) {
        if (audio.decodeAudioData) {
            audio.decodeAudioData(e.target.result, function(b) {
                source.buffer = b;
                $('#loading').hide();
            }, function(e) {
                clog(e);
                alert('Audio not playable or not supported.');
            });
        }
        else {
            source.buffer = audio.createBuffer(e.target.result, true);
            $('#loading').hide();
        }
    }

    reader.readAsArrayBuffer(e.dataTransfer.files[0]);
    source.connect(dsp);
    source.connect(analyser);
    dsp.connect(audio.destination);
    analyser.connect(audio.destination);
    source.loop = true;
    source.gain.value = 1;
    source.noteOn(0);
    if(Modernizr.webgl) {
		// Go!
		Visual.Surface.init();
	}
}

function mag2db(buffer) {
    var minDb = -72;
    var minMag = Math.pow(10.0, minDb / 20.0);
    var log = Math.log;
    var max = Math.max;
    var result = minDb;
    result = 20.0 * (log(max(buffer, minMag)) / Math.LN10);
    return result;
};



function draw(e) {
    var inp = e.inputBuffer.getChannelData(0);
    var out = e.outputBuffer.getChannelData(0);
    var peak = 0;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (var i = 0; i < inp.length; i++) {
        out[i] = 0;
        peak = (Math.abs(inp[i]) > peak ? Math.abs(inp[i]) : peak);
    }
    var db = Math.round(mag2db(peak)*1000)/1000;
    ctx.fillRect(0, canvas.height, 100, -(1 - (db / -72)) * (canvas.height - 10));
    ctx.fillRect(140, canvas.height, 100, -(1 - (db / -36)) * (canvas.height - 50));
    ctx.fillRect(240, canvas.height, 100, -(1 - (db / -92)) * (canvas.height - 20));
    
    ctx.fillRect(380, canvas.height, 100, -(1 - (db * 3/ -72)) * (canvas.height - 40));
    ctx.fillRect(500, canvas.height, 50, -(1 - (db / -26)) * (canvas.height - 20));
    ctx.fillRect(600, canvas.height, 70, -(1 - (db / -46)) * (canvas.height - 60));
    
    ctx.fillRect(700, canvas.height, 50, -(1 - (db * 5/ -72)) * (canvas.height - 30));
    ctx.fillRect(770, canvas.height, 100, -(1 - (db / -64)) * (canvas.height - 10));
    ctx.fillRect(900, canvas.height, 100, -(1 - (db / -23)) * (canvas.height - 50));
    
    ctx.fillRect(1200, canvas.height, 70, -(1 - (db * 2/ -36)) * (canvas.height - 80));
    ctx.fillRect(1300, canvas.height, 40, -(1 - (db / -38)) * (canvas.height - 40));

    if (Math.abs(peak) >= 1 || peaked == true) {
        ctx.fillStyle = "#AFAFAF";
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
        if(Math.abs(peak) >=1) clips++;
        peaked = true;
    }
    else {
        ctx.fillStyle = "black";
    }
    
    drawFrequencyGraph();
}

function drawFrequencyGraph() {
    if (fdata == null) fdata = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(fdata);

    ctx.strokeStyle = '#bbc2ff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    for (var j = 0; j < fdata.length; j++) {
        j == 0 ? ctx.moveTo(20 + (j / (canvas.width - 40)), 60 + (255-fdata[j])) : ctx.lineTo(20 + ((j / fdata.length) * (canvas.width - 40)), 60 + (255-fdata[j]));
    }
    ctx.stroke();
    
}

$(function() {
    audio = new(window.AudioContext || window.webkitAudioContext)();
    canvas = document.querySelector('#back-canvas');
    ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    canvas.addEventListener('dragover', noop, false);
    canvas.addEventListener('drop', drop, false);
    document.addEventListener('dragover', noop, false);
    document.addEventListener('drop', drop, false);
});

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize, false);
