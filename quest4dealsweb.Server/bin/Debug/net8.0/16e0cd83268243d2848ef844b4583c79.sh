function list_child_processes () {
    local ppid=$1;
    local current_children=$(pgrep -P $ppid);
    local local_child;
    if [ $? -eq 0 ];
    then
        for current_child in $current_children
        do
          local_child=$current_child;
          list_child_processes $local_child;
          echo $local_child;
        done;
    else
      return 0;
    fi;
}

ps 42743;
while [ $? -eq 0 ];
do
  sleep 1;
  ps 42743 > /dev/null;
done;

for child in $(list_child_processes 42748);
do
  echo killing $child;
  kill -s KILL $child;
done;
rm /Users/oscar/Documents/My Portfolio Website/Quest4Deals/quest4dealsweb.Server/bin/Debug/net8.0/16e0cd83268243d2848ef844b4583c79.sh;
