package TZOffset;
use strict;
use warnings;
use Number;
use Longitude;

sub new_from_seconds ($$) {
  return bless {seconds => Number->new_from_perl ($_[1])}, $_[0]; # XXX duration
} # new_from_seconds

sub parse ($$) {
  my ($class, $input) = @_;
  if ($input =~ /\A([+-])([0-9]+):([0-9]+)(?::([0-9]+(?:\.[0-9]+|))|)\z/) {
    my $seconds = $2 * 3600 + $3 * 60 + ($4 || 0);
    $seconds *= -1 if $1 eq '-';
    return $class->new_from_seconds ($seconds);
  } else {
    return undef;
  }
} # parse

sub sign ($) {
  return $_[0]->{seconds}->sign;
} # sign

sub seconds ($) {
  return $_[0]->{seconds}->to_perl; # XXX duration
} # seconds

sub longitude ($) {
  return Longitude->new_from_number
      (Number->new_from_perl ($_[0]->seconds * 15 / 3600));
} # longitude

sub to_string ($) {
  my $self = $_[0];

  my $number = $self->{seconds}->absolute;
  my $value = $number->floor->to_perl;
  my $delta = $number->to_perl - $value;

  my $sign = $self->sign;
  my $h = int ($value / 3600);
  my $m = int (($value - $h*3600) / 60);
  my $s = $value - $h*3600 - $m*60;

  if ($s == 0 and not $delta) {
    return sprintf '%s%02d:%02d',
        $sign < 0 ? '-' : '+', $h, $m;
  } else {
    my $x = sprintf '%s%02d:%02d:%02d',
        $sign < 0 ? '-' : '+', $h, $m, $s;
    # XXX
    $delta =~ s/^0\././;
    $delta = '' if $delta eq '0';
    return $x . $delta;
  }
} # to_string

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
