module tb;
  reg clk = 0;
  always #5 clk = ~clk;
reg a, b, cin;
  wire sum, cout;
  integer i;
  integer pass;
  full_adder dut(a, b, cin, sum, cout);
  initial begin
    pass = 1;
    for (i = 0; i < 8; i = i + 1) begin
      {a, b, cin} = i[2:0];
      #1;
      if (sum !== (a ^ b ^ cin) || cout !== ((a & b) | (a & cin) | (b & cin)))
        pass = 0;
      $display("%b %b %b -> sum %b cout %b", a, b, cin, sum, cout);
    end
    $display("%s full adder", pass ? "PASS" : "FAIL");
    $finish;
  end
endmodule
