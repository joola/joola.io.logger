@echo off

set my_command=node
set my_params="%~dp0\..\joola.io.logger" %*

    %my_command% %my_params%