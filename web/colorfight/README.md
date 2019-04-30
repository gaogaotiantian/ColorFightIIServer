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

In this case, the equivalent attack energy has to be at least ```attack_cost```
to successfully attack the cell. 

The more energy the player uses to attack the cell, the more ```force_field```
will be generated after the cell is occupied so it is harder for other players 
to take it back. The generated ```force_field``` will be
 ```(equivalent_energy - attack_cost) * 2```. The upper limit of ```force_field``` is 1000.

No matter whether the attack is successful, all the energy will be spent.

> For example, assume the ```attack_cost``` of a cell is ```100```.
  
> Case 1, if player A spent 50 energy to attack it, the attack would fail and 
  player A will lose 50 energy(which is not a wise move). 
  
> Case 2, if player A spent 150 energy to attack it, the attack would succeed and
  player A will occupy the cell with 150 energy spent. The cell will also have 100
  ```force_field``` because 50 extra energy is spent to attack it, 
so the ```attack_cost``` will be 200. 
  
> Case 3, if player A spent 150 energy and player B spent 150 energy. The 
  ```equivalent_energy``` will be 0 so the attack would fail. Both A and B lose
  150 energy(bad for them but this is not a stupid move for them because they
  would not have known).
  
> Case 4, if the player A spent 350 energy and player B spent 150 energy, the 
  ```equivalent_energy``` will be 350 - 150 = 200 and player A will take the cell.
  player B will lose 150 energy and the ```force_field``` would be (200 - 100) * 2 = 200.

Notice that players can attack their own cells as a strategy.

> For example, assume the ```attack_cost``` of a cell is ```100``` and Player A
  owns it. Player B decided to use 100 energy to attack the cell and Player A
  attack that cell with 1 energy on the same round. Then the equivalent energy
  would be 99 and Player B would fail to attack that cell.

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

Notice the player can build and upgrade the building on the same round. The 
commands will be parsed in order.

### Update

#### Order

1. Parse all the commands
    1. building will be built
    2. upgrade will finish
    3. resource will be spent
2. Update cells
    1. parse all the attack commands, calculate the owner of the cell for next
       round. if buildings are destroyed, compute effects
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
  ```Home``` has a very high ```attack_cost``` which is determined by the 
  ```level``` of the building and the ```energy``` the user owns. ```Home```
  also provides fixed amount of ```energy``` and ```gold```. As ```home``` 
  stores the gold of the user, ```1/3``` of the total ```gold``` the user owns
  will be stolen if ```Home``` is destroyed.
    * ```attack_cost``` = ```(1000 + user.energy + force_field) * level```
    * ```upgrade_cost``` = ```[(1000, 1000), (2000, 2000)]```
    * ```energy``` = ```10 * level```
    * ```gold``` = ```10 * level```
    * Destroy effect: ```1/3``` of ```gold``` will be stolen by attacker
* ```EnergyWell``` is the building to increase the energy production. When 
  ```EnergyWell``` is destroyed, the energy it is producing will become the 
  ```force_field``` of the cell after it's taken.
    * ```cost``` = ```100 gold```
    * ```upgrade_cost``` = ```[(200, 0), (400, 0)]```
    * ```energy``` = ```natural_energy * (1 + level)```
    * Destroy effect: ```(50, 150, 350)[level - 1]``` ```force_field``` will be
      added to the cell
* ```GoldMine``` is the building to increase the gold production. When 
  ```GoldMine``` is destoyed, the gold left in there will become the trophy of 
  the attacker.
    * ```cost``` = ```100 gold```
    * ```upgrade_cost``` =  ```[(200, 0), (400, 0)]```
    * ```gold ``` = ```natural_gold * (1 + level)``` 
    * Destroy effect: ```(50, 150, 350)[level-1]``` ```gold``` will be added to
      the attacker
* ```Fortress``` is the building to improve the defense of the territory. A 
  ```Fortress``` will increase the amount of ```force_field``` of both the cell
  it's on and all the adjacent owned cells. It will also decrease the amount of
  ```force_field``` of all the adjacent enemy cells.
    * ```cost``` = ```100 gold```
    * ```upgrade_cost``` =  ```[(200, 0), (400, 0)]```
    * ```adjacent_forcefield_incr``` = ```2 + level```
    * ```self_forcefield_incr``` = ```5 * level```
    * ```adjacent_forcefield_decr``` = ```10 * (1 + level)```


```upgrade_cost``` = [level2 cost(gold, energy), level3 cost(gold, energy)]

A building will be destroyed if the cell is occupied by another player.

#### Force Field

A ```MapCell``` will have a ```force_field``` after it's occupied by a player. 
This will equivalently add ```attack_cost``` to the ```MapCell``` so it would 
be harder for other players to occupy it.
```force_field``` is determined by the energy a player puts to attack the cell 
and the total energy all players put to attack this cell in that round. 

```force_field = int(min(1000, 2*(energy*2 - total_energy - attack_cost)))```

```force_field``` will be added to ```attack_cost```

After each round, ```force_field``` will be updated based on surrounding cells.
For each enemy surrounding cell, ```force_field``` will reduce ```10```. For
each self cell, ```force_field``` will increase ```2```.

> For example. Player A owns cell (2, 2) and currently the cell has 100 
  ```force_field```. Player A owns (2, 1) and (1, 2), too. (2, 3) is empty and
  Player B owns (3, 2). Therefore the cell (2, 2) has 2 self cells and 1 emeny
  cell around, so for each round, the ```force_field``` will reduce 10 - 2 * 2
  = 6.

> ```Fortress``` will affect the change of ```force_field```. If Player A owns
  cell (2, 2) and has a level 1 ```Fortress``` on it. Player A owns (2, 1) with
  a level 2 ```Fortress``` and (1, 2) with nothing. Player B owns (2, 3) with
  a level 1 ```Fortress``` and (3, 2) with nothing. The cell (2, 2) will have 
  a ```force_field``` change for ```5 + 4 + 2 - 20 - 10``` = ```-19```

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

#### Tax Amount

```tax_amount``` is determined by the number of cells and resource buildings 
(```energy_well``` and ```gold_mine```) a player owns. The more cells and 
resource buildings a player owns, the larger the ```tax_amount``` will be.

The equation for ```tax_amount``` generated from number of cells and buildings
are the same.

number  | tax
----    | ----
0-100   | no tax
100-200 | 1 per cell/building
200-300 | 2 per cell/building
300-400 | 3 per cell/building
...     | ...
800-900 | 8 per cell/building

> For example. A player has 337 cells on which 102 ```gold_mines```, 73 
  ```energy_wells``` and 99 ```fortress``` are built. First we need to calculate
  the tax generated by number of cells. The tax for cells would 
  be ```0 + 100*1 + 100*2 + 37*3 = 411```. Then we know the number of resource 
  buildings is 102 + 73 = 175, so the tax generated by buildings would be
  ```0 + 75*1 = 75``` The total tax would be ```411 + 75 = 486```

> As a result, 486 gold and 486 energy will be reduced from the player each
  round.

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
