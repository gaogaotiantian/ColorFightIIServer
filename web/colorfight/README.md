# ColorfightII Rules

## Overview

ColorfightII is a round based game where players try to expand their territory 
and collect resource to win the game. 

There are two kinds of resources:

* Energy
* Gold

Each player starts with a certain amount of energy and a home cell. The player
will get energy and gold from the cells they occupy. Each cell provides 
different amount of energy and gold per round.

Players use energy to attack and occupy other cells to expand their territory,
therefore collect more gold and energy source.

Players use gold to build different buildings on their own cells to help the
game process.

At the end of the game, the player with the highest amount of gold wins.

## Game Flow

### Preparation

In the beginning of each game, a 30x30 map will be generated. Each cell of the map
will have ```natural_cost```, ```natural_energy``` and ```natural_gold``` 
attributes. 

### Register

During anytime of the game, a player is allowed to register to the
game. The player will be assigned to a cell, this cell will be the home of
the player. A player will have 1000 ```energy``` when register to the game.

### Command

For each round, a player could give a list of valid commands. The possible 
commands are:

* attack
* build
* upgrade

#### attack

Players could use a certain amount of energy to attack a cell that's adjacent
to their already occupied cells. 

To successfully attack(or occupy) the cell, the player has to spend at least
```attack_cost``` amount of energy.

If multiple players attack one cell in the same round, the player spends the 
most energy will be the attacker and the equivalent attack energy will be
```max_energy * 2 - total_energy``` where ```max_energy``` is the maximum energy
a player spends and the ```total_energy``` will be all the energy spent on this
cell. 

In this case, the ```equivalent_energy``` has to be at least ```attack_cost```
to successfully attack the cell. 

The more energy the player uses to attack the cell, the more ```force_field```
will be generated after the cell is occupied so it is harder for other players 
to take it back. The generated ```force_field``` will be the equivalent energy
spent on the cell times 2. The upper limit of ```force_field``` is 1000.

No matter whether the attack is successful, all the energy will be spent.

> For example, assume the ```attack_cost``` of a cell is ```100```.
  
> Case 1, if player A spent 50 energy to attack it, the attack would fail and 
  player A will lose 50 energy(which is not a wise move). 
  
> Case 2, if player A spent 150 energy to attack it, the attack would succeed and
  player A will occupy the cell with 150 energy spent. The cell will also have 300
  ```force_field``` so the ```attack_cost``` will be higher. 
  
> Case 3, if player A spent 150 energy and player B spent 150 energy. The 
  ```equivalent_energy``` will be 0 so the attack would fail. Both A and B lose
  150 energy(bad for them but this is not a stupid move for them because they
  would not have known).
  
> Case 4, if the player A spent 350 energy and player B spent 150 energy, the 
  ```equivalent_energy``` will be 200(350-150) and player A will take the cell.
  player B will lose 150 energy and the ```force_field``` would be 400.

#### build

A player could build on occupied cells.

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

A ```MapCell``` will generate energy and gold each round based on 
```natural_energy```, ```natural_gold``` and the building on the cell. 

```energy_source``` and ```gold_source``` shows the resource a ```MapCell```
can produce per round.

However, the actual energy and gold a player gets may be taxed if the player
owns too many cells.

For every 100 cells the player owns, a 10% tax will be applied to the energy
and gold income.

#### Building

Players can build on a ```MapCell``` that's owned by them. Only one building
is allowed on one ```MapCell```

Each building has a ```level```. When the building is built, the ```level```
is ```1```. Players can upgrade their buildings(increase level) with resources 
as long as the building's level is less than their ```tech_level```(Upgrading
home is not restricted by this rule).

A building on a ```MapCell``` will change the amount of energy and gold the 
cell provides. 

* ```Home``` is automatically built on the cell that the player spawns. 
    * ```attack_cost``` 1000
    * ```upgrade_cost``` = ```[(1000, 1000), (2000, 2000), (4000, 4000)]```
    * ```energy``` = ```10 * level```
    * ```gold``` = ```10 * level```
* ```EnergyWell``` is the building to increase the energy production.
    * ```cost``` = ```100 gold```
    * ```upgrade_cost``` = ```[(200, 0), (400, 0), (800, 0)]```
    * ```energy``` = ```natural_energy * (1 + level)```
* ```GoldMine``` is the building to increase the gold production.
    * ```cost``` = ```100 gold```
    * ```upgrade_cost``` =  ```[(200, 0), (400, 0), (800, 0)]```
    * ```gold ``` = ```natural_gold * (1 + level)``` 

```upgrade_cost``` = [level1 cost(gold, energy), level2 cost(gold, energy), level3 cost(gold, energy)]

A building will be destroyed if the cell is occupied by another player.

#### Force Field

A ```MapCell``` will have a ```force_field``` after it's occupied by a player. 
This will equivalently add ```attack_cost``` to the ```MapCell``` so it would 
be harder for other players to occupy it.
```force_field``` is determined by the energy a player puts to attack the cell 
and the total energy all players put to attack this cell in that round. 

```force_field = int(min(1000, 2*(energy*2 - total_energy)))```

```force_field``` will be added to ```attack_cost```

### GameMap

```GameMap``` consists of ```GAME_WIDTH * GAME_HEIGHT``` ```MapCell```s.

In the beginning of the game, the game will generate a ```GameMap``` and blur
it so the ```natural_cost``` will be smooth.

```natural_cost``` is moderately related to ```natural_energy``` and 
```natural_gold```

### User

Each player enters the game with a ```username``` and a ```password```. If a
player register with the same ```username``` and ```password```, it will be 
treated as the same user. Duplicate usernames are not allowed.

A player starts with 1000 ```energy``` and 0 ```gold```. 

#### Tech Level

```tech_level``` is determined by the highest level of ```home``` buildings the
player has. ```tech_level``` limits the level of all other buildings. The player
needs to upgrade their home to a higher level, therefore achieves a higher
```tech_level```, before they upgrade other buildings.

#### Tax Level

```tax_level``` is determined by the cell number the player owns. For every
100 cells, a 10% tax will be applied to the energy and gold income. 

For example, if the player has 298 cells, the ```tax_level``` will be 2 and a 
20% tax will be applied to the player's energy and gold income. 

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
