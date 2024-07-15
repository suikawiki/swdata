use strict;
use warnings;
use Path::Tiny;
use JSON::PS;

my $in_name = shift;
my $out_name = shift;

my $in_path = path ($in_name);
my $in_json = json_bytes2perl $in_path->slurp;

my $part_size = 100;

my $out_parts = [];
my $out_parts_x = [];
{
  for my $key (qw(eras tags)) {
    next unless defined $in_json->{$key};
    for my $k (keys %{$in_json->{$key}}) {
      my $i = $in_json->{$key}->{$k}->{id} // $k;
      my $part = int ($i / $part_size);
      $out_parts->[$part]->{$key}->{$i} = $in_json->{$key}->{$k};
    }
  }
  for my $tr (@{$in_json->{transitions} or []}) {
    my $found = {};
    for my $i (keys %{$tr->{relevant_era_ids}}) {
      my $part = int ($i / $part_size);
      next if $found->{$part}++;
      push @{$out_parts->[$part]->{transitions} ||= []}, $tr;
    }
  }
}

for my $i (0..$#$out_parts) {
  my $out_path = path ("$out_name-$i.json");
  #$out_path->spew (perl2json_bytes_for_record $out_parts->[$i]);
  $out_path->spew (perl2json_bytes $out_parts->[$i]);
}

## License: Public Domain.
