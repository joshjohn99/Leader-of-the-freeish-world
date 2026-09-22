# Game music

The footer player has Play, Stop, and Next controls. Open Music for track selection, volume, and playback status. The selected track always repeats. Stop rewinds; Next wraps around the playlist (or restarts a one-track playlist). Changing tracks while playing continues playback; changing while stopped stays stopped.

The first user-supplied MP3 is stored at public/audio/presidential-march.mp3 and displayed as Presidential March. It is about 61 seconds long. The original Downloads file is unchanged.

The playlist now also includes Anthem of the Victor (public/audio/anthem-of-the-victor.mp3) and Banner of the Ancestors (public/audio/banner-of-the-ancestors.mp3), in that order after Presidential March. All three files were supplied by the user.

To add tracks, place each audio file in public/audio and add its id, title and /audio/... URL to web/music-tracks.ts. No player or simulation code changes are needed.

The player is mounted once outside game panels. Office/map navigation and day transitions do not recreate the audio element. Music never changes the simulation or consumes a turn. Selected track and volume are optional browser preferences under freedoma-music-v1; music starts only after the player presses Play, including after reload. The HTML audio element handles repeat without polling or additional libraries.
