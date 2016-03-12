package SWD::Eras;
use strict;
use warnings;
use JSON::PS;
use Path::Tiny;

my $RootPath = path (__FILE__)->parent->parent->parent;

our $Defs = json_bytes2perl $RootPath->child ('local/data/calendar-era-defs.json')->slurp;
our $Systems = json_bytes2perl $RootPath->child ('local/data/calendar-era-systems.json')->slurp;

my $EraIdToKey = [];
for (values %{$Defs->{eras}}) {
  $EraIdToKey->[$_->{id}] = $_->{key};
}

sub get_era_by_string ($) {
  if ($_[0] =~ /\A[0-9]+\z/) {
    return $Defs->{eras}->{$EraIdToKey->[$_[0]] // return undef}; # or undef
  } else {
    my $def = $Defs->{eras}->{$_[0]};
    return $def if defined $def;
  }
  my $key = $Defs->{name_to_key}->{jp}->{$_[0]};
  return $Defs->{eras}->{$key} if defined $key;
  return undef;
} # get_era_by_string

sub get_nearby_era_keys ($) {
  my $era = $_[0];
  my $all = {};
  for (keys %{$era->{names}}) {
    for (keys %{$Defs->{name_to_keys}->{$_}}) {
      $all->{$_} = 1;
    }
  }
  delete $all->{$era->{key}};
  return [keys %$all];
} # get_nearby_era_keys

sub get_era_and_era_year ($$$) {
  my ($def, $unix, $year) = @_;
  my $jd = $unix / (24*60*60) + 2440587.5;

  my $era;
  E: {
    for (reverse @{$Systems->{systems}->{$def}->{points}}) {
      $era = $_->[2];
      last E if $_->[0] eq 'jd' and $_->[1] <= $jd;
      last E if $_->[0] eq 'y' and $_->[1] <= $year;
    }
    $era = undef;
  } # E

  my $era_year;
  my $data;
  if (defined $era) {
    $data = $Defs->{eras}->{$era};
    die "Era |$era| not found" unless defined $data;
    $era_year = $year - $data->{offset};
    $era = $data->{name};
  } else {
    $data = {offset => 0};
    $era = $Defs->{eras}->{AD}->{name};
    $era_year = $year;
  }
  return ($era, $era_year);
} # get_era_and_era_year

1;

=head1 LICENSE

Copyright 2016 Wakaba <wakaba@suikawiki.org>.

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
