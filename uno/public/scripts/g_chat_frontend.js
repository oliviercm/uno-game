const message_container = document.querySelector('.chat-field')
const messageButton = document.querySelector('.input-button')
const input = document.querySelector('.input-field-chat')
const socket = io({
    path: "/global-chat/"
});

messageButton.addEventListener('click', addMessage);

socket.on('message',(data) => {
    message_container.innerHTML += `
      
        <p> ${data.message}<p>
   
        `;
})

function addMessage () {
    if(input.value === '') {
        return
    } else {

        var message = {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body:JSON.stringify({
                "message": input.value
            })
        }
        fetch('/api/global-chat', message)
       
    input.value = '';
    input.focus();
    }
}