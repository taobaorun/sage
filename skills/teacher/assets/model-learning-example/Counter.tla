------------------------------ MODULE Counter ------------------------------
EXTENDS Naturals, Sequences
VARIABLES n, pc, seen
vars == <<n, pc, seen>>

Init == /\ n = 0
        /\ pc = <<"ready", "ready">>
        /\ seen = <<0, 0>>

Read(i) == /\ pc[i] = "ready"
           /\ seen' = [seen EXCEPT ![i] = n]
           /\ pc' = [pc EXCEPT ![i] = "read"]
           /\ UNCHANGED n

Write(i) == /\ pc[i] = "read"
            /\ n' = seen[i] + 1
            /\ pc' = [pc EXCEPT ![i] = "done"]
            /\ UNCHANGED seen

Done == /\ pc = <<"done", "done">>
        /\ UNCHANGED vars

Next == (\E i \in 1..2: Read(i) \/ Write(i)) \/ Done
Spec == Init /\ [][Next]_vars
TypeOK == /\ n \in 0..2
          /\ pc \in [1..2 -> {"ready", "read", "done"}]
          /\ seen \in [1..2 -> 0..2]
BothCounted == pc = <<"done", "done">> => n = 2
=============================================================================
