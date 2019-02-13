# ColorfightII Rules

## Introduction

ColorfightII is a round based game. For each round, the players can send an
action list during a period of time, then the server will update based on the 
actions.

Each player has two kinds of resources:

* Energy
* Gold

Players use energy to attack and occupy other cells to collect more gold and
energy source.

Players use gold to build different buildings on their own cells to help the
game process.

At the end of the game, the player with the highest amount of gold wins.

## Game Feature

### MapCell

A ```MapCell``` represents a cell that a user can occupy. 

```MapCell``` can produce energy and gold for each round. It has three natural
attributes:

* ```natural_energy``` (1 - 10)
* ```natural_gold``` (1 - 10)
* ```natural_cost``` (1 - 300)

The natural attributes of a cell will not change in a game. However, the actual
energy and gold it produces and the actual cost to occupy it may change due to
other aspects. 

#### Building

Players can build on a ```MapCell``` that's owned by them.

Players can upgrade their buildings with resources under certain conditions.

* ```Home``` is automatically built on the cell that the player spawns. 
    * ```attack_cost``` 1000
    * ```upgrade_cost``` = ```[(1000, 1000), (2000, 2000), (4000, 4000)]```
    * ```energy``` = ```10 * level```
    * ```gold``` = ```10 * level```
* ```EnergyWell``` is the building to increase the energy production.
    * ```cost``` = ```100 gold```
    * ```upgrade_cost``` = ```[(200, 200), (400, 400), (800, 800)]```
    * ```energy``` = ```natural_energy * (1 + level)```
* ```GoldMine``` is the building to increase the gold production.
    * ```cost``` = ```100 gold```
    * ```upgrade_cost``` =  ```[(200, 200), (400, 400), (800, 800)]```
    * ```gold ``` = ```natural_gold * (1 + level)``` 

A building will be destroyed if the cell is attacked by other player.

#### Force Field

A ```MapCell``` will have a ```force_field``` after it's occupied by a player.
```force_field``` is determined by the energy a player puts to attack the cell 
and the total energy all players put to attack this cell. 

```force_field = int(min(1000, 2*(energy*2 - total_energy)))```

```force_field``` will be added to ```attack_cost```

### GameMap

```GameMap``` consists of ```GAME_WIDTH * GAME_HEIGHT``` ```MapCell```s.

In the beginning of the game, the game will generate a ```GameMap``` and blur
it so the ```natural_cost``` will be smooth.

### User

Each player enters the game with a ```username``` and a ```password```. If a
player register with the same ```username``` and ```password```, it will be 
treated as the same user. 

A player starts with 100 ```energy``` and 0 ```gold```. 

## Game Flow

### Preparation

In the beginning of each round, a map will be generated. Each cell of the map
will have ```natural_cost```, ```natural_energy``` and ```natural_gold``` 
attributes. 

### Register

During anytime of the game, a player is allowed to join, or register to the
game. The player will be assigned to a cell, this cell will be the home of
the player. A player will have 100 ```energy``` when register to the game.

### Command

For each round, a player could give a list of valid commands. The possible 
commands are:

* attack
* build
* upgrade

#### attack

A player could use a certain amount of energy to attack a cell that's adjacent
to occupied cells. The amount of energy has to be more than or equal to the 
```attack_cost``` of that cell, otherwise the command will fail. Failed command
will not cost the player's energy.

The more energy the player uses to attack the cell, the more ```force_field```
will be generated so the cell is harder to attack by other players. 

If multiple players attack one cell in a single round, the player has to spend
more than 50% of the total energy spent on that cell to occupy the cell. If
no player satisfied this condition, no player will occupy the cell, but all the
energy they use will be spent. 

#### build

A player could build on the occupied cell.

A player needs ```cost``` amount of gold to build the building. 

The buildings will take affect the round they are built. 

#### upgrade

A player could upgrade their buildings to have better effects from them. 
The maximum level of the building(except for home) is limited by the level of
home. You need to upgrade your home before upgrading other buildings. 

All buildings including home start at level 1. After each upgrade, the level
will increase by 1. 

### Update

#### Force field

For each enemy's cell around the cell, ```force_field``` will lose 5% for each
round.

#### Order

1. Parse all the commands
    1. building will be built
    2. upgrade will finish
2. Update cells
    1. parse all the attack commands, calculate the owner of the cell for next
       round.
    2. ```gold``` and ```energy``` income will be calculated based on the new
       possessions.
    3. ```tech_level``` will be determined.
    4. ```force_field``` will be updated accordingly.
3. Update players
    1. ```gold``` and ```energy``` will be updated 
    2. player without any cell will be dead 

## Communication

### Message from a client

The only API for an action is through ```parse_action(uid, msg)```

```msg``` should be a string representing a json object. 

* register: ```{'action':'register', 'username': username, 'password':password}```
* command: ```{'action':'command', 'cmd_list':cmd_list}```
    * ```cmd_list``` should be a list of command strings

#### Command Format

* attack: ```"a <x> <y> <energy>"```. ex ```"a 2 3 100"```
* build: ```"b <x> <y> <building>"``` ex ```"b 3 5 g"```

### Message to a client

The only API to get information from the game is ```get_game_info()```.

```get_game_info()``` will return a dictionary. The web server is responsible 
to convert it to string.

#### Format of game info

```
{
    "turn": <int, current turn>,
    "info": {
        "max_turn": <int, max turn number the game will last>,
        "width": <int, width of the game map>,
        "height": <int, height of the game map>
    },
    "error": {
        uid: [
            <str, error_message>
        ]
    },
    "game_map": {
        [
            [
                {
                    "position": [<int, x>, <int, y>],
                    "building":  {
                        "name": <str, building name>,
                        "level": <int, level of the building>
                    },
                    "attack_cost": <int, cost to attack the cell>,
                    "owner": <int, uid>,
                    "gold": <int, gold the cell generates a round>,
                    "energy": <int, energy the cell generates a round>,
                    "natural_gold": <int, natural_gold of the cell>,
                    "natural_energy": <int, natural_energy of the cell>,
                    "natural_cost": <int, natural_cost of the cell>,
                    "force_field": <int, force_field of the cell>
                }
                ...
            ]
            ...
        ]
    },
    "users": {
        uid: {
            "uid": <int, user id>,
            "username": <str, username>,
            "energy": <int, current energy the user has>,
            "gold": <int, current gold the user has>,
            "dead": <bool, if the user is dead>,
            "tech_level": <int, technology level or the maximum home level>
            "energy_source": <int, how much energy the user will gain each round>,
            "gold_source": <int, how much gold the user will gain each round>,
            "cells": [
                [<int, x>, <int, y>], ...            
            ]
        }
    }
}
```
