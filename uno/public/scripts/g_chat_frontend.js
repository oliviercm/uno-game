const message_container = document.querySelector('.chat-field')
const messageButton = document.querySelector('.input-button')
const input = document.querySelector('.input-field-chat')
const socket = io()


socket.on('chat-message', data => {
    console.log(data)
})

messageButton.addEventListener('click', addMessage);


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
        .then((response)=>{
            console.log("HERE")
            console.log(response)
        })
        message_container.innerHTML += `
      
        <p> ${input.value}<p>
   
        `;
    input.value = '';
    input.focus();
    }
}