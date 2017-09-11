package Longitude;
use strict;
use warnings;
use Number;

sub new_from_number ($$) {
  return bless {number => $_[1]}, $_[0];
} # new_from_number

sub normalized ($) {
  my $self = $_[0];
  my $value = $self->{number}->to_perl;
  my $floor = $self->{number}->floor->to_perl;
  my $delta = $value - $floor;
  my $normalized = $floor % 360;
  $normalized -= 360 if $normalized > 180;
  $normalized += $delta;
  return ref ($self)->new_from_number
      (Number->new_from_perl ($normalized));
} # normalized

sub sign_inverted ($) {
  my $self = $_[0];
  return ref ($self)->new_from_number
      (Number->new_from_perl (-$self->{number}->to_perl));
} # sign_inverted

sub to_deg ($) {
  return $_[0]->{number}->to_perl;
} # to_deg

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
