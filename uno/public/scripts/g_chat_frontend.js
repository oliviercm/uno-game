const message_container = document.querySelector('.chat-field')
const messageButton = document.querySelector('.input-button')
const input = document.querySelector('.input-field-chat')
const socket = io({
    path: "/global-chat/"
});

messageButton.addEventListener('click', addMessage);

socket.on('message',(data) => {
    message_container.innerHTML += createContainer(data.username, data.message)
})

function createContainer(username, message){
    return `
<div class="row comments mb-2">
<div class="col-md-2 col-sm-2 col-3 text-center user-img">
<p>&nbsp</p>
</div>
<div class="col-md-9 col-sm-9 col-9 comment rounded mb-2">
<h4 class="m-0"><a href="#">${username}</a></h4>
<time class="text-white ml-3"></time>
<like></like>
<p class="mb-0 text-white">${message}</p>
</div>
</div>

`
}

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