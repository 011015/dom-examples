var squareNumber = document.querySelector('#number3');

var result2 = document.querySelector('.result2');

myWorker.port.start();

squareNumber.onchange = function() {
	myWorker.port.postMessage([squareNumber.value,squareNumber.value,2]);
	console.log('Message posted to worker');
}

myWorker.port.onmessage = function(e) {
	if(e.data[1] == 1) {
      result1.textContent = e.data[0];
      console.log('Message received from worker');
    } else if(e.data[1] == 2) {
      result2.textContent = e.data[0];
      console.log('Message received from worker');
    }
}