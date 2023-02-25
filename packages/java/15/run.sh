mv $1 $1.java
filename=$1.java
shift
java $filename "$@"
