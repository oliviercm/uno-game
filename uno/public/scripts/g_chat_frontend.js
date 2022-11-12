const message_container = document.querySelector('.chat-field')
const messageButton = document.querySelector('.input-button')
const input = document.querySelector('.input-field-chat')

messageButton.addEventListener('click', addMessage);


function addMessage () {
    if(input.value === '') {
        return
    } else {
        message_container.innerHTML += `
      
            <p> ${input.value}<p>
   
        `;
    input.value = '';
    input.focus();
    }
}