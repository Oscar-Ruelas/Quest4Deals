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

ps 38561;
while [ $? -eq 0 ];
do
  sleep 1;
  ps 38561 > /dev/null;
done;

for child in $(list_child_processes 38592);
do
  echo killing $child;
  kill -s KILL $child;
done;
rm /Users/oscar/Documents/My Portfolio Website/Quest4Deals/quest4dealsweb.Server/bin/Debug/net8.0/f3066a1ca89a4b3089b7f3e93973c693.sh;
