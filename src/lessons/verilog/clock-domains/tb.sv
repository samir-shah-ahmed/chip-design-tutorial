module tb;
  reg clk = 0;
  always #5 clk = ~clk;
reg rst, async_in;
  wire sync_out;
  sync2 dut(.clk(clk), .rst(rst), .async_in(async_in), .sync_out(sync_out));
  initial begin
    rst = 1; async_in = 0;
    repeat (2) @(posedge clk);
    @(negedge clk); rst = 0; async_in = 1;
    @(posedge clk); #1;
    if (sync_out !== 1'b0) begin
      $display("FAIL sync_out rose after one clock");
      $finish;
    end
    @(posedge clk); #1;
    if (sync_out === 1'b1) $display("PASS synced after two clocks");
    else $display("FAIL sync_out=%b after two clocks", sync_out);
    $finish;
  end
endmodule
