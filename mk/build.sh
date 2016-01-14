#!/bin/sh

# See `watch` target in Makefile.

# clear xterm history
printf "\033c"
# what is to be done
printf "\033[0;33m%s\033[0;m\n" "$*"

# run make
"$@"

media=/usr/share/sounds/freedesktop/stereo

if [ $? -eq 0 ]; then
    play $media/message.oga 2> /dev/null
else
    play $media/bell.oga 2> /dev/null
    # raise xterm window
    printf "\033[05t"
fi
