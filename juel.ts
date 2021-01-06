

import './src/BlazorBinding';

//import './lib/jquery-ui-1.12.1.custom/jquery-ui.js';

import { IsMobile } from './src/_Utils/IsMobile';
import { Vh } from './src/_Utils/Vh';

import './src/Template/Template';
import './src/Accordion/Accordion';
import './src/RadialMenu/RadialMenu';
import './src/FileInput/FileInput';
import './src/Colour/Colour';
import './src/DialogManager/DialogManager';
import './src/FilteredList/FilteredList';
import './src/SpeechSection/SpeechSection';
import './src/FishEye/FishEye';
import './src/Parallax/Parallax';
import './src/BoxMenu/BoxMenu';
import './src/Tooltip/Tooltip';
import './src/Mdi/Mdi';
import './src/Tabs/Tabs';
import './src/Select/Select';
import './src/ScrollPane/ScrollPane';
import './src/List/List';

import './src/Flip/Flip';


$(function() {
    IsMobile();
    Vh();
});

/*
import styles from 'bootstrap/dist/css/bootstrap.min.css';

var el = document.createElement("style");
el.innerHTML = styles;
document.head.append()

*/