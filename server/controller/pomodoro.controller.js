import express from 'express';
import passport from 'passport';
import User, { Pokemons } from '../models/index.js';


const pomodoroController = express.Router();
const BERRIES_TO_EVOLVE = 4;

// get the amount of berries user has
pomodoroController.get(
  '/berries',
  passport.authenticate('jwt', {session: false}),
  (req, res) => {
    const userid = req.user._id
    
    User.findById(userid, function(err, result) {
      if (err) {
        res.send(err);
      } else {
        console.log(result.berries)
        // res.json(result.berries); // User object with the userid from the jwt token
        res.json(result.berries); // User object with the userid from the jwt token
      }
    });

    // User.find({}, (err, result) => {
    //         res.status(200).json({
    //           data: result,
    //         });
    //       });

  }
);

// update user's berries count (positive/negative count)
pomodoroController.put(
  '/berries/:count',
  passport.authenticate('jwt', {session: false}),
  async (req, res) => {
    try {
      const count = Number(req.params.count);
      let user = await User.findById(req.user._id);
      user.berries = Number(user.berries) + count;
      user.save();

      res.json(
        {message: `berries updated by ${count}`}
      )
    } catch (e) {
       console.log( e.message );
    }
  }
);

// return data to generate weekly graph
pomodoroController.get(
  '/weeklyGraph',
  passport.authenticate('jwt', {session: false}),
  (req, res) => {
    const userid = req.user._id
    User.findById(userid, function(err, result) {
      if (err) {
        res.send(err);
      } else {
        console.log('weeklygraph ', result.weeklyGraph)
        // res.json(result.berries); // User object with the userid from the jwt token
        res.json(result.weeklyGraph); // User object with the userid from the jwt token
      }
    });
  }
);

// randomly determines an event for after user completes a pomodoro session.
pomodoroController.put(
  '/event/:focustime',
  passport.authenticate('jwt', {session: false}),
  async (req, res) => {
    try {
      // get a random event: new pokemon, levelup existing pokemon, get a berry
      let eventLimit = 9;
      const events = 
      {
        GET_BERRIES: 5,
        GET_POKEMON: 7,
        EVOLVE: 9,
      };
      
      let user = await User.findById(req.user._id).populate("pokemons");
      // check if user has enough berries to evolve a pokemon
      if( user.berries < BERRIES_TO_EVOLVE ) eventLimit = events['GET_POKEMON'];
      const randomEvent= Math.floor(Math.random()*eventLimit);
      
      let result = {};
      if (randomEvent< events['GET_BERRIES']) {
        // user, time
        result = await getBerries( user, Number(req.params.focustime));
        console.log('get berries ', result);
      } else if (randomEvent< events['GET_POKEMON']) {
        // user
        result = await getPokemon( user );
        console.log('get pokemon ', result);
      } else {
        result = await evolvePokemon(user);
        console.log('get evolve ', result);
      }

      // WHAT IF user has all the pokemons?
      // WHAT IF user has all the pokemons evolved?
      res.json(result);
    } catch (e) {
      console.log(e.message);
    }
  }
);

// user gets awarded berries
const getBerries = async ( user, time) => {
  try {
    const berries = time >= 45 ? 2 : 1;
    user.berries = Number(user.berries) + berries;
    await user.save();
    return {
      message: `You got ${berries} berries!`,
      image: '',
      berries: user.berries,
    };
  } catch (e) {
    console.error(e.message);
  }
}

// user gets awareded a pokemon
const getPokemon = async ( user ) => {
  try {
    let randomPokemonId;
    let userPokemonIds = [];

    // get an array of user's pokemons - just the pokemonId
    userPokemonIds = user.pokemons.map( x => x.pokemonId)

    // get a pokemon that the user doesn't have yet
    do {
      randomPokemonId = Math.floor(Math.random()*(151-1)+1);
    } while( userPokemonIds.includes(randomPokemonId) )

    // get the new pokemon's _id to save to the user's pokemons array field
    const pokemonObject = await Pokemons.findOne({pokemonId: randomPokemonId}).exec();
    user.pokemons[randomPokemonId] = pokemonObject._id;
    await user.save();

    return {
      message: `You've caught ${pokemonObject.name}!`,
      image: pokemonObject.image.large,
      // berries: user.berries,
    };
  } catch (e) {
    console.error(e.message)
  }
}


// user gets a pokemon evolved
const evolvePokemon = async ( user ) => {
  try {
    // get a list of user's pokemons that can evolve (evolvesTo != null) && < 151
    const userPokemonThatCanEvolve = user.pokemons.filter( x => x.evolvesTo <= 151); 
    let pokemonIndexToEvolveFrom;
    let pokemonIdToEvolveTo;

    // get a random pokemon to evolve to & check that the user doesn't already have the evolved pokemon (in user.pokemons)
    do {
      // randomly get a pokemon that can evolve
      pokemonIndexToEvolveFrom = Math.floor( Math.random() * (userPokemonThatCanEvolve.length-1-1));
      // get the new evolved pokemon's id, and see if user.pokemson[that id] === null, else, get another random pokemon
      pokemonIdToEvolveTo = userPokemonThatCanEvolve[pokemonIndexToEvolveFrom].evolvesTo
    } while( user.pokemons[pokemonIdToEvolveTo] )

    // get the new evolved pokemon's ObjectID 
    const evolvedPokemonObject = await Pokemons.findOne({pokemonId: pokemonIdToEvolveTo}).exec()
    
    // add the pokemon's Object ID to the user's pokemon list
    user.pokemons[pokemonIdToEvolveTo] = evolvedPokemonObject._id;
    // subtract berries needed to evolve the pokemon from user's berries count
    user.berries = user.berries - BERRIES_TO_EVOLVE;
    await user.save();

    return{
      message: `Your ${userPokemonThatCanEvolve[pokemonIndexToEvolveFrom].name} has evolved ${evolvedPokemonObject.name}!`,
      image: evolvedPokemonObject.image.large,
      berries: user.berries,
    };
  } catch(e) {
    console.error(e.message)
  }
}



//temporary api
// get new pokemon
pomodoroController.post(
  '/newpokemon', 
  passport.authenticate('jwt', {session: false}),
  async (req,res) => {
    try {
      let randomPokemonId;
      let userPokemonIds = [];
      const userid = req.user._id;
      const user = await User.findById(userid)
        .populate('pokemons')
        .exec();
        // console.log(user);
        // console.log('populated user: ', user);
        userPokemonIds = user.pokemons.map( x => x.pokemonId)
        // console.log('pokemons: ', userPokemonIds)

        // get a pokemon that the user doesn't already have
        do {
          randomPokemonId = Math.floor(Math.random()*(151-1)+1);
          // console.log('randomPokemon: ', randomPokemonId)
        } while( userPokemonIds.includes(randomPokemonId) )

        console.log('we\'re getting ', randomPokemonId)
      
      // get new pokemon's _id to save to the user's pokemons field
      const pokemonObject = await Pokemons.findOne({pokemonId: randomPokemonId}).exec();
      user.pokemons[randomPokemonId] = pokemonObject._id;
      user.save();
      // console.log(pokemonObject)
      // console.log(pokemonObject._id)
      // console.log('SAVED')
      res.json(pokemonObject)

    } catch (e) {
      console.log(e.message)
    }
  }
);

// temporary api
// get pokemon to evolve
pomodoroController.post(
  '/evolve',
  passport.authenticate('jwt', {session: false}),
  async (req,res) => {
    try {
      let user = await User.findById(req.user._id)
        .populate('pokemons')
        .exec();

      // MIGHT MOVE THIS OUT
      // check if user has enough berries
      if( user.berries < BERRIES_TO_EVOLVE) return; // or return message like: 'you don't have enough berries to evolve, here's a berry for next time

      // get a list of user's pokemons that can evolve (evolvesTo != null) && < 151
      const userPokemonThatCanEvolve = user.pokemons.filter( x => x.evolvesTo <= 151); 
      let pokemonIndexToEvolveFrom;
      let pokemonIdToEvolveTo;

      // get a random pokemon to evolve to & check that the user doesn't already have the evolved pokemon (in user.pokemons)
      do {
        // randomly get a pokemon that can evolve
        pokemonIndexToEvolveFrom = Math.floor( Math.random() * (userPokemonThatCanEvolve.length-1-1));
        // get the new evolved pokemon's id, and see if user.pokemson[that id] === null, else, get another random pokemon
        pokemonIdToEvolveTo = userPokemonThatCanEvolve[pokemonIndexToEvolveFrom].evolvesTo
      } while( user.pokemons[pokemonIdToEvolveTo] )

      // get the new evolved pokemon's ObjectID 
      const evolvedPokemonObject = await Pokemons.findOne({pokemonId: pokemonIdToEvolveTo}).exec()
      
      // add the pokemon's Object ID to the user's pokemon list
      user.pokemons[pokemonIdToEvolveTo] = evolvedPokemonObject._id;
      // subtract berries needed to evolve the pokemon from user's berries count
      user.berries = user.berries - BERRIES_TO_EVOLVE;
      user.save();

      res.json(
        {
          message: `Your ${userPokemonThatCanEvolve[pokemonIndexToEvolveFrom].name} has evolved to ${evolvedPokemonObject.pokemonId} ${evolvedPokemonObject.name}!`,
          image: evolvedPokemonObject.image.large,
          berries: user.berries,
        }
      );
    } catch (e) {
      console.log(e.message)
    }
  }
)

export default pomodoroController;
