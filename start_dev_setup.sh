id=rundop

tmux new-session -s "$id" -c $(pwd) -d 'nginx -c local_reverse_proxy_configuration/nginx.conf -p $(pwd)'
tmux split-window -t "$id" -c $(pwd)/rest_backend './node_modules/nodemon/bin/nodemon.js'
tmux attach-session -t "$id"

#nginx -c local_reverse_proxy_configuration/nginx.conf -p $(pwd)

