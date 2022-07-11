import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import useSound from 'use-sound';
//import actions
import { startFocusSession, endFocusSession, startBreakSession, endBreakSession, defaultState } from '../../store/actions/timerState';
import { event, addSessionStats, updateWeeklyStats } from '../../store/actions/pomodoroEvent';
// import css, assets and components
import './PomodoroTimer.css'
import TimeDisplay from '../TimeDisplay/TimeDisplay';
import DisplayPokemon from '../DisplayPokemon/DisplayPokemon';
import backIcon from '../../assets/img/Back-Vector.svg';
import musicIcon from '../../assets/img/music.svg';
import musicOffIcon from '../../assets/img/musicoff.svg';
import soundRainStorm from '../../assets/sounds/heavy-rain-storm-sounds.mp3';

const PomodoroTimer = (props) => {
  const user = useSelector((state) => state.authReducer.authData);
  const selectedFocusTime = useSelector((state) => state.selectedFocusTime);
  const selectedBreakTime = useSelector((state) => state.selectedBreakTime);
  const pomodoroState = useSelector((state) => state.pomodoroState);

  const dispatch = useDispatch();
  let navigate = useNavigate();

  // states
  const [timer, setTimer] = useState();
  const [runTimer, setRunTimer] = useState(false);
  const [focus, setFocus] = useState(true);
  const [timerPause, setTimerPause] = useState(false);
  const [runningTime, setRunningTime] = useState(selectedFocusTime);
  const [play, audioOptions] = useSound(soundRainStorm, {loop: true});
  const [isPlaying, setIsPlaying] = useState(false);

  // on component load, start timer countdown
  useEffect( () => {
    startTimer();
  },[])

  const startTimer = () => {
    console.log('start', pomodoroState)
    if (focus) {
        setRunningTime(selectedFocusTime);
        dispatch(startFocusSession());
    } else {
        setRunningTime(selectedBreakTime);
        dispatch(startBreakSession());
    }
    setRunTimer(true);
    setTimerPause(false);
  };

  useEffect(() => {
    let interval = 0;

    if (runTimer) {
        interval = setInterval(updateTime, 1000);
        setTimer(interval);
    }

    return () => {
        clearInterval(interval);
    };
  }, [runTimer, runningTime]);

  const updateTime = () => {
    if (runningTime > 0) {
      // pre-fetch the data
      if( focus && runningTime === 4) {
        dispatch(event(selectedFocusTime));
      }
      setRunningTime(runningTime => runningTime - 1);
    }

    // when timer ends
    if (runningTime === 0) {
      if (focus)  {
          dispatch(endFocusSession())
          dispatch(updateWeeklyStats(
            { 
              focusTime: selectedFocusTime,
              taskCompleted: 0,
              cycle: 0,
            }
          ));
      } else {
          let cycles = 0;
          dispatch(endBreakSession());
          dispatch(addSessionStats(
            { 
              sessionDateTime: new Date(), 
              focusTime: selectedFocusTime,
              breakTime: selectedBreakTime,
            }
          ), cycles);
          dispatch(updateWeeklyStats(
            { 
              breakTime: selectedBreakTime,
            }
          ));
          navigateHome();
      }
      setRunTimer(false);
      setFocus(!focus);
      clearInterval(timer);
    }
  };

  const pauseTimer = () => {
    clearInterval(timer);
    setRunTimer(!runTimer);
    setTimerPause(!timerPause);
  };

  const handleTimerControl = () => {
    if (runningTime > 0) {
      pauseTimer();
    } else if ( runningTime === 0) {
      startTimer();
    }
  }

  const handleMusicClick = () => {
    if (isPlaying) {
      audioOptions.pause();
      console.log('stop')
      setIsPlaying(!isPlaying);
    } else {
      play();
      console.log('play')
      setIsPlaying(!isPlaying);
    }
  }

  const handlePageChange = () => {
    dispatch(defaultState());
  }

  const navigateHome = () => {
    dispatch(defaultState());
    return navigate("/");
  }

  return (
    <div className='PomodoroTimer'>
      <div className="topSection">
        <div 
          className="navgation-btn btn"
          >
          <Link to={`/`}>
            <img 
              src={ backIcon } 
              className="backIcon .icon-btn"
              alt="back-arrow icon"
              onClick={ handlePageChange }
            />
          </Link>
        </div>
        <div className="soundscape">
          <div 
            className="btn"
            >
            <img 
              src={ isPlaying ? musicIcon : musicOffIcon } 
              className={"musicIcon icon-btn"}
              alt="music icon"
              onClick={ handleMusicClick }
            />
          </div>
        </div>
      </div>
      <DisplayPokemon />
      <div>
        <TimeDisplay timeInSeconds={ (runTimer || timerPause) ? runningTime : focus ? selectedFocusTime*60 : selectedBreakTime*60}/>
      </div>
      <div 
        className="button"
        onClick={ handleTimerControl }
        style={{ display: "flex" }}
      >
        {runTimer ? "Pause" : runningTime > 0 ? "Resume" : "Start Break" }
      </div>
      {/* <div
        className="button"
        style={{ display: runningTime === 0 ? "flex" : "none" }}
        // onClick={}
      >
        Add 5 more minutes
      </div> */}
      {/* <div className="taskItem" style={{display: pomodoroState === 'FOCUS_SESSION_START'? "" : "none"}}>
        <input type="checkbox"/>
        <div className="taskName">
            task item here
        </div>
      </div> */}
    </div>
  );
}

export default PomodoroTimer;