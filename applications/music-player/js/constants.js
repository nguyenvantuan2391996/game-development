const API_KEY_ENCODED = "QUl6YVN5QnV2NEtOUjJ3S2xtNWRNcC1GUlo5aExFS0dicWtNRXJj";
const API_KEY = atob(API_KEY_ENCODED);

const NOT_FOUND_SONG = "The song is not found";

const NOT_FOUND = "not found";

// localStorage keys
const QUEUE_KEY = "queue_songs";
const QUEUE_INDEX_KEY = "queue_index";
const FAVORITES_KEY = "favorite_songs";
const VOLUME_KEY = "player_volume";
const SHUFFLE_KEY = "player_shuffle";
const REPEAT_KEY = "player_repeat";

// repeat modes
const REPEAT_OFF = 0;
const REPEAT_ALL = 1;
const REPEAT_ONE = 2;
