#!/bin/bash
################################################################################
# Example usage: ./loop.sh /home/ubuntu/bb2tcp/ arg1 arg2 arg3                 #
################################################################################
# The first argument has to be a full path to the folder containing bb2tcp.js. #
# All the remaining arguments will be forwarded to bb2tcp.js as command line   #
# parameters when spawning the node instance.                                  #
################################################################################
date_format="%a %b %d %H:%M:%S %Y"
################################################################################
# Use a lockfile containing the pid of the running process. If this script     #
# crashes and leaves the lockfile around, it will have a different pid so it   #
# will not prevent it from running again.                                      #
################################################################################
lf=/tmp/eH1h87RgT4eE6R3I
touch $lf
read lastPID < $lf

if [ ! -z "$lastPID" -a -d /proc/$lastPID ]
then
    now=`date +"$date_format"`
    printf "\033[1;36m%s\033[0m :: Process is already running!\n" "$now"
    exit
fi
echo $$ > $lf

pid_node=0

working_directory="$1"
if [ $# -eq 0 ]
then
    working_directory="."
fi
cd "$working_directory"
path=`pwd`

now=`date +"$date_format"`
printf "\033[1;36m%s\033[0m :: Started bb2tcp loop in %s (PID %s).\n" "$now" "$path" "$$"

cleanup()
{
    trap - "$1"
    now=`date +"$date_format"`
    printf "\n\033[1;36m%s\033[0m :: Caught signal (%s).\n" "$now" "$1"

    if [ $pid_node -ne 0 ]
    then
        sleep 1
        if ps -p $pid_node > /dev/null
        then
            now=`date +"$date_format"`
            printf "\033[1;36m%s\033[0m :: Killing bb2tcp (PID %s).\n" "$now" "$pid_node"
            kill -KILL "$pid_node" 2>/dev/null
            wait 2>/dev/null
        fi
    fi

    now=`date +"$date_format"`
    printf "\033[1;36m%s\033[0m :: The loop of bb2tcp has finished.\n" "$now"
}

handle_sigint()
{
    cleanup "SIGINT"
    kill -INT $$
}

handle_sigterm()
{
    cleanup "SIGTERM"
    exit
}

trap handle_sigint SIGINT
trap handle_sigterm SIGTERM

while :
do
    now=`date +"$date_format"`
    printf "\033[1;36m%s\033[0m :: Starting up the bb2tcp node instance.\n" "$now"
    # WARNING! The following line should be the only child process because later
    # there is a wait call that is supposed to wait after the node process. The
    # existence of any other children would make that wait call to hang forever.
    node ./bb2tcp.js "${@:2}" > bb2tcp.log 2>&1 & # Only this line must end with the & ampersand!
    pid_node=`jobs -p | tail -n 1`
    sleep 3
    if ps -p $pid_node > /dev/null
    then
        now=`date +"$date_format"`
        printf "\033[1;36m%s\033[0m :: The node instance of bb2tcp is now running.\n" "$now"
    else
        now=`date +"$date_format"`
        printf "\033[1;36m%s\033[0m :: The node instance of bb2tcp has failed to start.\n" "$now"
        sleep 60
        wait 2>/dev/null
        continue
    fi

    while ps -p $pid_node > /dev/null
    do
        sleep 5
    done

    now=`date +"$date_format"`
    printf "\033[1;36m%s\033[0m :: The node instance of bb2tcp has closed, restarting...\n" "$now"
    wait 2>/dev/null
    sleep 5
done

