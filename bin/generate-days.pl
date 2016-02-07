use strict;
use warnings;
use Path::Tiny;
use JSON::PS;

my $root_path = path (__FILE__)->parent->parent;
my $json_path = $root_path->child ('local/data/days-orig.json');
my $json = json_bytes2perl $json_path->slurp;

delete $json->{_errors};
for my $md (keys %{$json}) {
  for my $key (keys %{$json->{$md}}) {
    for my $data (@{$json->{$md}->{$key}}) {
      delete $data->{date_julian};
      delete $data->{date_kyuureki};
      delete $data->{date_wikipedia};
      delete $data->{date_wikipedia_local};
      delete $data->{wref}
          if defined $data->{name} and defined $data->{wref} and
             $data->{name} eq $data->{wref};
    }
  }
}

print perl2json_bytes $json;

## License: Public Domain.
