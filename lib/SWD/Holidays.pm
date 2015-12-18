package SWD::Holidays;
use strict;
use warnings;
use JSON::PS;
use Path::Tiny;

my $RootPath = path (__FILE__)->parent->parent->parent;

our $JPHolidays = json_bytes2perl $RootPath->child ('local/data/jp-holidays.json')->slurp;
our $RyukyuHolidays = json_bytes2perl $RootPath->child ('local/data/ryukyu-holidays.json')->slurp;
our $JPFlagdays = json_bytes2perl $RootPath->child ('local/data/jp-flagdays.json')->slurp;

1;

=head1 LICENSE

Copyright 2015 Wakaba <wakaba@suikawiki.org>.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but
WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
Affero General Public License for more details.

You does not have received a copy of the GNU Affero General Public
License along with this program, see <http://www.gnu.org/licenses/>.

=cut
