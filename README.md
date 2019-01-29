This is the new version of ColorFight

The client should use ```WebSocket``` to communicate with the server.

Two ```WebSocket``` instances are used for the game. 

## Game Channel

The first one is on ```game_channel```, which collects information from the 
game. The client should keep this ws alive, this channel is read only, meaning
the client should wait for the server to publish data.

### Data Format

Data is in json format.

TODO: detailed description.

## Action Channel

The second one is on ```action_channel```, which is used for clients to send
actions to the server.

### Action Format

The client should send a ```string``` representing a json object.

```{'action': action, **kwargs}```

```action``` is a string representing the kind of action. It could be

* register
    * {'action': 'register', 'username': username, 'password': password}
* command
    * {'action': 'command', 'cmd_list': cmd_list}

#### Command List

The client interacts with the server with command list. The command list should
be a list of commands in a single turn. 

A command is a string with arguments separated by spaces

ex ```a 2 3 200``` 

The first argument represents for the kind of command.

* ```'a'``` for Attack
    * 'a x y energy'
    * Attack ```(x, y)``` with ```energy```


