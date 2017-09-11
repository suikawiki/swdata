package Number;
use strict;
use warnings;
use POSIX ();

sub new_from_perl ($$) {
  return bless {value => $_[1]}, $_[0];
} # new_from_perl

sub sign ($) {
  return $_[0]->{value} < 0 ? '-1' : '+1';
} # sign

sub absolute ($) {
  return ref ($_[0])->new_from_perl (abs $_[0]->{value});
} # absolute

sub floor ($) {
  return ref ($_[0])->new_from_perl (POSIX::floor ($_[0]->{value}));
} # floor

sub ceil ($) {
  return ref ($_[0])->new_from_perl (POSIX::ceil ($_[0]->{value}));
} # ceil

sub to_perl ($) {
  return $_[0]->{value};
} # to_perl

1;

=head1 LICENSE

Copyright 2017 Wakaba <wakaba@suikawiki.org>.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but
WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
Affero General Public License for more details.

You does not have received a copy of the GNU Affero General Public
License along with this program, see <https://www.gnu.org/licenses/>.

=cut
