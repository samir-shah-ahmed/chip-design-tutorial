module tb;
  reg clk = 0;
  always #5 clk = ~clk;
reg rst, event_in;
  wire seen;
  wire [7:0] cycle;
  probe dut(.clk(clk), .rst(rst), .event_in(event_in), .seen(seen), .cycle(cycle));
  initial begin
    rst = 1; event_in = 0;
    repeat (2) @(posedge clk);
    @(negedge clk); rst = 0;
    repeat (3) @(posedge clk);
    @(negedge clk); event_in = 1;
    @(negedge clk); event_in = 0;
    repeat (2) @(posedge clk);
    #1;
    if (seen === 1'b1) $display("PASS seen stuck after the pulse");
    else $display("FAIL seen=%b", seen);
    $finish;
  end
endmodule
